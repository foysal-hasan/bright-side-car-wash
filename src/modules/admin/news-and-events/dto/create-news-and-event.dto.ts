import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, IsBoolean, IsOptional, IsUUID, IsArray } from 'class-validator';
import { IsCuid } from 'src/common/validators/is-cuid.validator';

export class CreateNewsAndEventDto {
    @ApiProperty({ example: 'Annual Tech Summit 2026' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: '<p>Rich editor contents here...</p>' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({ example: 'A brief summary outline.' })
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Cover image file upload',
        required: true,
    })
    @IsOptional()
    image?: File;

    image_url?: string | undefined = undefined;

    @ApiProperty({ example: 'cmr1p392t0001sgtmjflf5k2p' })
    @IsCuid()
    @IsNotEmpty()
    category_id: string;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    is_published?: boolean = false;

    created_by_id?: string; // ID of the user creating the news/event

    @ApiPropertyOptional({ description: 'Array of media file CUIDs to attach to the news/event', example: ['cm123abc', 'cm456def'] })
    @IsOptional()
    @IsArray()
    @IsCuid({ each: true })
    fileIds?: string[];
}