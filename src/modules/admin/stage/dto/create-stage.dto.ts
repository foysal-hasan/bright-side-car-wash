import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";


export class CreateStageDto {
    @ApiProperty({ description: 'The name of the stage', example: 'New Lead' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'The color of the stage', example: '#FF5733' })
    @IsNotEmpty()
    @IsString()
    color: string;

    // sorted order of the stage in the pipeline
    @ApiProperty({ description: 'The order of the stage in the pipeline', example: 1, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    sort_order: number;

    @ApiProperty({
        description: 'Icon file for the stage (image)',
        type: 'string',
        format: 'binary',
        required: true,
    })
    file: File; // This will be set by the file upload

    icon?: string; // Optional field for stage icon
}
