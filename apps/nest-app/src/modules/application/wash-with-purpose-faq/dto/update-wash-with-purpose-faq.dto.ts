import { PartialType } from '@nestjs/swagger';
import { CreateWashWithPurposeFaqDto } from './create-wash-with-purpose-faq.dto';

export class UpdateWashWithPurposeFaqDto extends PartialType(CreateWashWithPurposeFaqDto) {}
