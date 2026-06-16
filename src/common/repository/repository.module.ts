import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserRepository } from './user/user.repository';
import { ChatRepository } from './chat/chat.repository';
import { UcodeRepository } from './ucode/ucode.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    ChatRepository,
    UcodeRepository,
  ],
  exports: [
    UserRepository,
    ChatRepository,
    UcodeRepository,
  ],
})
export class RepositoryModule {}
