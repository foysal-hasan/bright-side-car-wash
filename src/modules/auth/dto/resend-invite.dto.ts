import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ResendInviteDto {
    @ApiProperty({
        description: 'Email address of the staff member',
        example: 'staff.mike@company.com',
        format: 'email',
        required: true,
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}