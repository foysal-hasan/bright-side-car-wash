// create-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The name of the role',
    example: 'Manager',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name: string; // e.g., "Manager" (Dynamic)

  @ApiProperty({
    description: 'The description of the role',
    example: 'Role for managers with elevated permissions',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The IDs of the permissions associated with the role',
    example: ['permission1', 'permission2'],
    isArray: true,
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[]; 
}
