import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemberQueryDto } from './dto/member-query.dto';
import { Prisma } from 'src/generated/prisma/client';
import { ChangeRolesDto } from './dto/update-member.dto';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { DateHelper } from 'src/common/helper/date.helper';
import appConfig from 'src/config/app.config';



@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  /**
   * 1. List of Members
   */
  async listMembers(query: MemberQueryDto) {
    const { search, page = 1, limit = 10 } = query;

    // Calculate how many records to skip
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { deleted_at: null };

    if (search?.trim()) {
      const searchTerms = search.trim();
      where.OR = [
        { name: { contains: searchTerms, mode: 'insensitive' } },
        { email: { contains: searchTerms, mode: 'insensitive' } },
        { username: { contains: searchTerms, mode: 'insensitive' } },
      ];
    }

    // Execute count and paginated query in parallel
    const [totalItems, members] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          status: true,
          created_at: true,
          roleUsers: {
            include: {
              role: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      meta: {
        totalItems,
        itemCount: members.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
      data: members,
    };
  }

  /**
   * 2. View Member Details
   */
  async getMemberDetails(id: string) {
    const member = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        status: true,
        gender: true,
        created_at: true,
        roleUsers: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            assigned_leads: { where: { deleted_at: null } },
            sent_messages: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID "${id}" not found.`);
    }

    return {
      data: member
    };
  }

  private async invalidateSession(sessionId: string, ttlSeconds: number) {
    // Flag this session ID as dead in Redis for the remainder of the access token's life
    await this.redis.set(
      `blacklist:${sessionId}`,
      'true',
      'EX',
      ttlSeconds
    );
  }

  /**
   * 3. Change Member Roles (Sync Many-to-Many via RoleUser)
   */
  async changeMemberRolesByName(id: string, dto: ChangeRolesDto) {
    // 1. Verify target user exists
    const userExists = await this.prisma.user.count({ where: { id, deleted_at: null } });
    if (!userExists) throw new NotFoundException(`User with ID "${id}" does not exist.`);

    // 2. Lookup the roles matching the provided names (Case Insensitive)
    const matchedRoles = await this.prisma.role.findMany({
      where: {
        name: {
          in: dto.roleNames,
          mode: 'insensitive' as any,
        },
        // If your role model supports soft deletes, add: deleted_at: null
      },
      select: { id: true, name: true }
    });

    // 3. Throw an error if some of the names provided don't exist in the system
    if (matchedRoles.length !== dto.roleNames.length) {
      const foundNames = matchedRoles.map(r => r.name.toLowerCase());
      const missingNames = dto.roleNames.filter(name => !foundNames.includes(name.toLowerCase()));
      throw new BadRequestException(`The following roles do not exist in the system: ${missingNames.join(', ')}`);
    }

    // 4. Sync the many-to-many relationship using a transaction
    await this.prisma.$transaction(async (prisma) => {
      // Drop existing role mapping links
      await prisma.roleUser.deleteMany({ where: { user_id: id } });

      // Write new mapping connections using the found Role CUIDs
      await prisma.roleUser.createMany({
        data: matchedRoles.map((role) => ({
          user_id: id,
          role_id: role.id,
        })),
      })

      // block list all the session in redis for the user to force re-login and refresh permissions
      const userSessions = await prisma.userSession.findMany({ where: { userId: id } });
      for (const session of userSessions) {
        await this.invalidateSession(session.id, DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry || '7d').date.getTime() - new Date().getTime());
        await this.redis.del(`refresh_token:${session.id}`);
      }

      await prisma.userSession.deleteMany({ where: { userId: id } });
    });

    return matchedRoles.map(r => r.name);
  }

  /**
   * 4. Toggle Status Block / Unblock User
   */
  async toggleBlockStatus(id: string, block: boolean) {
    const member = await this.prisma.user.findFirst({ where: { id, deleted_at: null } });
    if (!member) throw new NotFoundException(`User with ID "${id}" does not exist.`);

    // Target status code: 0 for Blocked, 1 for Active Active state
    const targetStatus = block ? 0 : 1;

    await this.prisma.user.update({
      where: { id },
      data: { status: targetStatus },
    });

    return block
  }
}