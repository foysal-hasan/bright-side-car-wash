import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsOptional()
  @ApiProperty()
  name?: string;

  @IsNotEmpty()
  @ApiProperty()
  first_name?: string;

  @IsNotEmpty()
  @ApiProperty()
  last_name?: string;

  @IsNotEmpty()
  @ApiProperty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8' })
  @ApiProperty()
  password: string;

  @IsNotEmpty()
  gender:string;

  @IsNotEmpty()
  date_of_birth:string;

  @IsNotEmpty()
  phone_number:string;


  
}
