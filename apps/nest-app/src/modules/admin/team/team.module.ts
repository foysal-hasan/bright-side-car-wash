import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [
    ActivityLogModule
  ],
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
