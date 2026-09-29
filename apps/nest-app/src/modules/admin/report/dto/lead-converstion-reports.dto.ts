import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';


export class DynamicStageReportDto {

    @ApiProperty({
        description: 'The name of the dynamic stage to generate the report for',
        example: 'Converted',
    })
    @IsString()
    @IsNotEmpty({ message: 'A dynamic stage name is required.' })
    stageName: string;

    @ApiPropertyOptional({
        description: 'The start date for the report in ISO 8601 format',
        example: '2026-01-01T00:00:00Z',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'The end date for the report in ISO 8601 format',
        example: '2026-12-31T23:59:59Z',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}


export class StageBreakdownDto {
    @ApiProperty({
        description: 'An array of stage names to generate the breakdown report for. Must contain exactly three stage names.',
        example: ['New', 'In Progress', 'Converted'],
    })
    @IsNotEmpty({ message: 'Stage names are required.' })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(3, { message: 'Provide exactly three stage names.' })
    @ArrayMaxSize(3, { message: 'Provide exactly three stage names.' })
    stages: string[];
}

export class SourceBreakdownDto {
    @ApiPropertyOptional({
        description: 'The start date for the report in ISO 8601 format',
        example: '2026-01-01T00:00:00Z',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'The end date for the report in ISO 8601 format',
        example: '2026-12-31T23:59:59Z',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}