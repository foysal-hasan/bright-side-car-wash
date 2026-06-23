import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class ChangeRolesDto {
  @ApiProperty({
    description: 'Array of role names to assign to the user',
    example: ['Admin', 'Manager'],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  roleNames: string[];
}