/**
 * Tanat - Request body validation middleware
 *
 * Uses Zod schemas to validate and parse incoming JSON bodies.
 */

import { MiddlewareHandler } from 'hono';
import type { HonoEnv } from '../types';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Validate the request body against a Zod schema.
 * On success, the parsed body is available via `c.req.valid('json')` pattern —
 * but since Hono validators differ, we store it on a custom key.
 *
 * Usage: app.post('/', validateBody(MySchema), handler)
 */
export function validateBody<T extends z.ZodType>(schema: T): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    // Store parsed data so handlers can access it
    // @ts-expect-error — dynamic key
    c.set('validatedBody', result.data);
    await next();
  };
}

/**
 * Helper to retrieve the validated body from the context.
 */
export function getValidatedBody<T>(c: { get: (key: string) => unknown }): T {
  return c.get('validatedBody') as T;
}
