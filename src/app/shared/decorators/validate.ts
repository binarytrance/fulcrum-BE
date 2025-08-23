import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { RequestValidationError } from '@shared/errors';

export type IValidationSchemas = {
  body: ZodSchema<unknown>;
  params: ZodSchema<unknown>;
  query: ZodSchema<unknown>;
};

type IPartialValidationSchemas = Partial<IValidationSchemas>;
type IValidationSchemaKey = keyof IValidationSchemas;

export function Validate(validationSchemas: IPartialValidationSchemas) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value as (
      req: Request,
      res: Response,
      next?: NextFunction
    ) => unknown | Promise<unknown>;

    descriptor.value = async function (
      req: Request,
      res: Response,
      next?: NextFunction
    ) {
      const errors: ZodError[] = [];

      Object.keys(validationSchemas).forEach((key) => {
        const schema = validationSchemas[key as IValidationSchemaKey] as
          | ZodSchema
          | undefined;

        if (!schema) {
          return;
        }

        const result = schema.safeParse(req[key as IValidationSchemaKey]);
        console.log({ result });
        if (!result.success) {
          errors.push(result.error);
        } else {
          req[key as IValidationSchemaKey] = result.data;
        }
      });

      console.log({ errors });

      if (errors.length) {
        throw new RequestValidationError('Validation Failed', errors);
      }

      return await original.apply(this, [req, res, next]);
    };

    return descriptor;
  };
}
