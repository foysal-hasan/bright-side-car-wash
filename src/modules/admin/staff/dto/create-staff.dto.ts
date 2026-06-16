import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsValidRole } from 'src/common/validators/role.decorator';


export class CreateStaffDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsValidRole()
  @IsNotEmpty()
  @IsString()
  role: string;
}