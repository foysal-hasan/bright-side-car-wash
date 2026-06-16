import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Password reset token',
    example: '123456',
  })
  token: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'New password',
    example: 'newPassword123',
  })
  password: string;
}
