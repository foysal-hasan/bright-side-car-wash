import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GetTaxesDto {
    @ApiProperty({
        description: 'The ID of the location for which to retrieve taxes',
        example: 'location_12345',
    })
    @IsString()
    @IsNotEmpty()
    locationId: string;

    @ApiProperty({
        description: 'An array of service variation IDs for which to calculate taxes',
        example: ['service_variation_1', 'service_variation_2'],
    })
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    serviceVariationIds: string[];
}