import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateTestimonialDto } from './create-testimonial.dto';
import { Transform, Type } from 'class-transformer';

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {
    @ApiPropertyOptional({
        description: 'Flag to indicate if the avatar image should be deleted',
        type: 'boolean',
    })
    @Transform(({ value }) => value === 'true' || value === true)
    is_avatar_deleted?: boolean = false;
}
