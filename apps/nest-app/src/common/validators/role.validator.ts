// validators/role.validator.ts
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@ValidatorConstraint({ name: 'isValidRole', async: true })
@Injectable()
export class IsValidRoleConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(role: string, args: ValidationArguments) {
    if (!role) return false;
    
    const validRole = await this.prisma.role.findUnique({
      where: { name: role }
    });
    
    return !!validRole;
  }

  defaultMessage(args: ValidationArguments) {
    return `Role "${args.value}" is not valid. Please check the available roles.`;
  }
}