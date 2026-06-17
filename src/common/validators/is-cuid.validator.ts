import { 
  registerDecorator, 
  ValidationOptions, 
  ValidatorConstraint, 
  ValidatorConstraintInterface 
} from 'class-validator';

// CUID pattern: starts with 'c', followed by alphanumeric, total length 25
const CUID_PATTERN = /^c[a-z0-9]{24}$/;

@ValidatorConstraint({ name: 'isCuid', async: false })
export class IsCuidConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (typeof value !== 'string') return false;
    return CUID_PATTERN.test(value);
  }

  defaultMessage(): string {
    return 'Invalid CUID format. Must be a valid CUID (e.g., ck7x8y9z0a1b2c3d4e5f6g7h)';
  }
}

export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCuidConstraint,
    });
  };
}