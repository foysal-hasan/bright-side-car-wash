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

    @ApiProperty({
        description: 'Source of the assignment (e.g., Admin Panel, API)',
        example: 'Admin Panel',
    })
    @IsString()
    assignment_source?: string = 'Admin Panel'; // e.g., 'Admin Panel', 'API'

    assigned_by_id?: string; // ID of the user performing the assignment (optional, can be set by the service)

}