import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemberHighlightsQueryDto, MemberTableQueryDto } from '../dto/member-activity-report.dto';

@Injectable()
export class MemberActivityService {
    constructor(private readonly prisma: PrismaService) { }

    async getMemberHighlights(dto: MemberHighlightsQueryDto) {
        const startFilter = dto.startDate ? new Date(dto.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endFilter = dto.endDate ? new Date(dto.endDate) : new Date();

        const users = await this.prisma.user.findMany({
            where: { deleted_at: null },
            select: {
                first_name: true,
                last_name: true,
                assigned_leads: {
                    where: { created_at: { gte: startFilter, lte: endFilter }, deleted_at: null },
                    select: { id: true },
                },
            },
        });

        let activeStaffCount = 0;
        let totalAssignedLeads = 0;
        let mostAssignedMemberName = 'N/A';
        let maxAssignedCount = 0;

        users.forEach(user => {
            const assignedCount = user.assigned_leads.length;

            if (assignedCount > 0) {
                activeStaffCount++;
                totalAssignedLeads += assignedCount;

                // Compare total volume assigned to find the maximum workload holder
                if (assignedCount > maxAssignedCount) {
                    maxAssignedCount = assignedCount;
                    // Clean fallback handling for name assembly
                    mostAssignedMemberName = user.first_name || user.last_name
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : 'Unknown Member';
                }
            }
        });

        return {
            activeTeamMembers: activeStaffCount, // Matches card 1 title
            avgLeadsPerMember: activeStaffCount > 0 ? Math.round(totalAssignedLeads / activeStaffCount) : 0, // Matches card 2 title
            mostAssignedMember: { // Matches card 3 structure
                name: mostAssignedMemberName,
                assignedCount: maxAssignedCount,
            },
        };
    }

    async getMemberTable(query: MemberTableQueryDto) {
        try {
            const { page, limit, search } = query;
            const skip = (page - 1) * limit;

            // Fetch all core master stages configured in your system
            const activeStages = await this.prisma.stage.findMany({
                where: { deleted_at: null },
                select: { name: true },
            });

            const userWhere: any = {
                deleted_at: null,
                ...(search && {
                    OR: [
                        { first_name: { contains: search, mode: 'insensitive' } },
                        { last_name: { contains: search, mode: 'insensitive' } },
                        { name: { contains: search, mode: 'insensitive' } },
                    ],
                }),
            };

            const [totalItems, users] = await Promise.all([
                this.prisma.user.count({ where: userWhere }),
                this.prisma.user.findMany({
                    where: userWhere,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        assigned_leads: {
                            where: { deleted_at: null },
                            select: { stage: { select: { name: true } } },
                        },
                        roleUsers: { select: { role: { select: { name: true } } } },
                    }
                }),
            ]);

            const dataRows = users.map((user) => {
                // Initialize dynamic matrix bucket tracking map keys
                const stageCounts: Record<string, number> = {};
                activeStages.forEach(stage => {
                    stageCounts[stage.name] = 0;
                });

                // Compute row aggregate frequencies
                user.assigned_leads.forEach(lead => {
                    if (lead.stage?.name && stageCounts[lead.stage.name] !== undefined) {
                        stageCounts[lead.stage.name]++;
                    }
                });

                return {
                    id: user.id,
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    role: user.roleUsers?.map(roleUser => roleUser.role.name) || ["N/A"],
                    assigned: user.assigned_leads.length,
                    stageBreakdown: stageCounts,
                };
            });

            return {
                data: dataRows,
                meta: {
                    totalItems,
                    itemCount: dataRows.length,
                    itemsPerPage: limit,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                },
            };
        } catch (error) {
            throw new BadRequestException('Failed to process member activity data table.');
        }
    }
}