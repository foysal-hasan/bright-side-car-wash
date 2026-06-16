import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  // @IsNotEmpty()
  // @ApiProperty()
  // email: string;

  @IsNotEmpty()
  @ApiProperty()
  token: string;

  @IsNotEmpty()
  @ApiProperty()
  register_token: string;
}
