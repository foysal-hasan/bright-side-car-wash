import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

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
}