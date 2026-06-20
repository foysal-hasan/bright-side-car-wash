import { ApiProperty } from "@nestjs/swagger";
import { IsJWT, IsNotEmpty, IsString } from "class-validator";
import { IsCuid } from "src/common/validators/is-cuid.validator";

export class RefreshTokensDto {
    @ApiProperty({
        description: 'The valid JSON Web Token (JWT) used to issue a new access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiY2hhbGxlbmdlIjoiYWJjIn0.signature',
        type: String,
        required: true,
    })
    @IsNotEmpty({ message: 'Refresh token must not be empty' })
    @IsString({ message: 'Refresh token must be a string' })
    @IsJWT({ message: 'Refresh token must be a valid JWT format' })
    refresh_token: string;
}