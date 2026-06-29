import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsUrl, IsInt, Min, Max } from 'class-validator';

export class CreateTestimonialDto {
    @ApiProperty({
        description: 'A file for the testimonial avatar image',
        type: 'string',
        format: 'binary',
        required: false,
    })
    avatar_image?: File;

    avatar?: string;

    @ApiProperty({
        description: 'Name of the reviewer',
        example: 'Sarah Jenkins'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Job title or designation of the reviewer',
        example: 'Lead Software Engineer'
    })
    @IsString()
    @IsNotEmpty()
    designation: string;

    @ApiProperty({
        description: 'The actual testimonial body text',
        example: 'This application completely automated our workflow!'
    })
    @IsString()
    @IsNotEmpty()
    review_text: string;

    @ApiProperty({
        description: 'Rating out of 5 stars',
        minimum: 1,
        maximum: 5,
        default: 5,
        example: 5
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    ratings: number = 5;

    @ApiPropertyOptional({
        description: 'Flag to indicate if the testimonial is active',
        default: true,
        example: true
    })
    @IsOptional()
    @Type(() => Boolean)
    is_active?: boolean = true;
}