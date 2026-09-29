import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [
    ActivityLogModule
  ],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
