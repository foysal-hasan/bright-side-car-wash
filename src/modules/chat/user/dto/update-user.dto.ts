import { PartialType } from '@nestjs/swagger';
import { ChatCreateUserDto } from './create-user.dto';

export class ChatUpdateUserDto extends PartialType(ChatCreateUserDto) {}
