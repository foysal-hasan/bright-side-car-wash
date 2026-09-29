import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
export class ResetPasswordWithOtpDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '6 digit OTP sent to email',
    example: '123456',
  })
  otp: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'New password',
    example: 'newPassword123',
  })
  new_password: string;
}
