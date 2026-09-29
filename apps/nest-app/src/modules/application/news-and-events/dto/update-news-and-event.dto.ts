import { PartialType } from '@nestjs/swagger';
import { CreateNewsAndEventDto } from './create-news-and-event.dto';

export class UpdateNewsAndEventDto extends PartialType(CreateNewsAndEventDto) {}
