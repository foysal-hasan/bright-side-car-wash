import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetServicesQueryDto {
    @ApiPropertyOptional({
        description: 'The ID of the location to filter services by',
        example: 'loc_1234567890abcdef',
    })
    @IsOptional()
    @IsString()
    locationId?: string;

    @ApiPropertyOptional({
        description: 'Cursor for pagination, used to fetch the next page of results',
        example: 'cursor_1234567890abcdef',
    })
    @IsOptional()
    @IsString()
    cursor?: string;

    // @ApiPropertyOptional({
    //     description: 'The maximum number of services to return per page',
    //     example: 50,
    // })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 100; // Defaults to 100 per page if not provided by client
}
