import { Controller, Get, Query, Param, Patch, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CursorPaginationDto, OffsetPaginationDto } from './dto/get-notifications.dto';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';


@ApiTags('Admin / User Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(TransformResponseInterceptor)
export class NotificationController {
    constructor(private readonly service: NotificationService) { }

    @RequirePermission('notification:metrics')
    @Get('metrics')
    @ApiOperation({ summary: 'Get notification metrics for a specific recipient' })
    get_notification_metrics(@Req() req: Request) {
        return this.service.get_notification_metrics(req.user?.userId);
    }

    @Get('offset-feed')
    @ApiOperation({ summary: 'Numbered offset feed view with page queries' })
    find_many_offset(
        @Req() req: Request,
        @Query() query: OffsetPaginationDto,
    ) {
        return this.service.find_many_offset(req.user?.userId, query);
    }

    @Get('infinite-feed')
    @ApiOperation({ summary: 'Infinite scroll cursor feed view with index tokens' })
    find_many_cursor(
        @Req() req: Request,
        @Query() query: CursorPaginationDto,
    ) {
        return this.service.find_many_cursor(req.user?.userId, query);
    }

    @Patch('read/all')
    @ApiOperation({ summary: 'Mark all items as read' })
    mark_all_as_read(
        @Req() req: Request,
    ) {
        return this.service.mark_all_as_read(req.user?.userId);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark an item as read' })
    mark_as_read(
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        return this.service.mark_as_read(id, req.user?.userId);
    }
}