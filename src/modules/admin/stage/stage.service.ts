import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class StageService {
  constructor(private prisma: PrismaService) { }

  async create(createStageDto: CreateStageDto) {
    const { name, color, sort_order, icon } = createStageDto;
    const stage = await this.prisma.stage.create({
      data: {
        name,
        color,
        sort_order,
        icon,
      },
      select: {
        id: true,
        name: true,
        color: true,
        sort_order: true,
        icon: true,
      },
    });
    return stage;
  }

  async findAll() {
    const stages = await this.prisma.stage.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        sort_order: true,
        icon: true,
      },
      orderBy: {
        sort_order: 'asc',
      },
    });
    return stages;
  }

  async findOne(id: string) {
    const stage = await this.prisma.stage.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        color: true,
        sort_order: true,
        icon: true,
      },
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }
    return stage;
  }

  async update(id: string, updateStageDto: UpdateStageDto) {
    const { name, color, sort_order, icon } = updateStageDto;

    const updateData: Prisma.StageUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (icon !== undefined) updateData.icon = icon;

    const stage = await this.prisma.stage.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        color: true,
        sort_order: true,
        icon: true,
      },
    });
    return stage;
  }

  async remove(id: string) {
    const existingLeads = await this.prisma.lead.findFirst({
      where: { stage_id: id },
    });
    if (existingLeads) {
      throw new ConflictException(`Cannot delete stage with ID ${id} because it is associated with existing leads`);
    }
    await this.prisma.stage.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        color: true,
        sort_order: true,
      },
    });
    return null;
  }
}
