import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";
import { Transform } from "class-transformer";

export class ResendInviteDto {
    @ApiProperty({
        description: 'Email address of the staff member',
        example: 'staff.mike@company.com',
        format: 'email',
        required: true,
    })
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string;
}