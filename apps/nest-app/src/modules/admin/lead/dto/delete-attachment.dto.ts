import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteAttachmentDto {
  @IsString()
  @IsNotEmpty()
  path: string; // The specific file path you want to remove
}