import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class LogoutDto {
    @ApiProperty({
        description: 'Session ID to revoke',
        example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    })
    @IsNotEmpty()
    @IsUUID()
    sessionId: string;
}