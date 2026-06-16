import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyForgotPasswordOtpDto {
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
    description: '6 digit OTP sent to email',
    example: '123456',
  })
  otp: string;
}
