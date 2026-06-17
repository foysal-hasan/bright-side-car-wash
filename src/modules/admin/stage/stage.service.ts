import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StageService {
  constructor(private prisma: PrismaService) { }

  async create(createStageDto: CreateStageDto) {
    const { name, color, sort_order } = createStageDto;
    const stage = await this.prisma.stage.create({
      data: {
        name,
        color,
        sort_order,
      },
      select: {
        id: true,
        name: true,
        color: true,
        sort_order: true,
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
      },
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }
    return stage;
  }

  async update(id: string, updateStageDto: UpdateStageDto) {
    const { name, color, sort_order } = updateStageDto;
    const stage = await this.prisma.stage.update({
      where: { id },
      data: {
        name,
        color,
        sort_order,
      },
      select: {
        id: true,
        name: true,
        color: true,
        sort_order: true,
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
