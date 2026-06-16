// validators/role.decorator.ts
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationOptions, registerDecorator } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@ValidatorConstraint({ name: 'isValidRole', async: true })
@Injectable()
export class IsValidRoleConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(role: string): Promise<boolean> {
    if (!role) return false;
    
    const validRole = await this.prisma.role.findUnique({
      where: { name: role }
    });
    
    return !!validRole;
  }

  defaultMessage(): string {
    return 'Invalid role. Please check the available roles.';
  }
}

export function IsValidRole(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRoleConstraint,
    });
  };
}