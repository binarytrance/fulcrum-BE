import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { RequestValidationError } from '../services';

export type ValidationSchemas = {
  body: ZodSchema<unknown>;
  params: ZodSchema<unknown>;
  query: ZodSchema<unknown>;
};

export class ValidationMiddleware {
  constructor() {}

  public validate(validationSchemas: Partial<ValidationSchemas>) {
    return (req: Request, _: Response, next: NextFunction) => {
      const errors: Array<ZodError> = [];

      for (const key in validationSchemas) {
        const schema = validationSchemas[key as keyof ValidationSchemas];
        if (schema) {
          const result = schema.safeParse(req[key as keyof ValidationSchemas]);
          if (!result.success) {
            errors.push(result.error);
          }
        }
      }

      if (errors.length) {
        throw new RequestValidationError('Validation Failed', errors);
      }

      next();
    };
  }
}
