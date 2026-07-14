import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGalleryDto {
    @ApiProperty({ example: 'Summer Car Wash Event', description: 'The title/name of the gallery item' })
    @IsString()
    @IsNotEmpty()
    name: string;

    image?: string;

    @ApiProperty({ 
        type: 'string', 
        format: 'binary', 
        description: 'Upload a raw image file for the gallery item',
        required: true 
    })
    file: File

    @ApiPropertyOptional({ example: true, description: 'Indicates whether the gallery item is published or not' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) {
            return undefined;
        }
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }
        return Boolean(value);
    })
    is_published?: boolean = true;
}