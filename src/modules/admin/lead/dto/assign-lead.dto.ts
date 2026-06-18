import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { IsCuid } from "src/common/validators/is-cuid.validator";

export class AssignLeadDto {
    @ApiProperty({
        description: 'ID of the user to assign the lead to',
        example: 'cld0987654321abcdefg',
    })
    @IsString()
    @IsCuid({ message: 'Invalid user ID format' })
    assigned_to_id: string;

}