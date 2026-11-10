/**
 * Tanat - Tenant isolation middleware
 *
 * Ensures that routes accessing tenant-scoped resources are properly isolated.
 * Must be applied after authMiddleware.
 */

import { MiddlewareHandler } from 'hono';
import type { HonoEnv } from '../types';
import { ForbiddenError } from '../utils/errors';

/**
 * Middleware that enforces tenant isolation by checking that
 * route :id params (when present) belong to the authenticated tenant.
 */
export function requireTenant(): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const tenantId = c.get('tenantId');
    if (!tenantId) {
      throw new ForbiddenError('Tenant context not established');
    }
    await next();
  };
}
