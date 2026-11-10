/**
 * Tanat — request body size limit.
 *
 * Uses Hono's body-limit middleware, which measures the actual streamed bytes.
 * The previous implementation only checked `Content-Length`, so a chunked
 * request could bypass it (security review M-02).
 */

import type { MiddlewareHandler } from 'hono';
import { bodyLimit as honoBodyLimit } from 'hono/body-limit';
import type { HonoEnv } from '../types';

export function bodyLimit(maxBytes = 1_000_000): MiddlewareHandler<HonoEnv> {
  return honoBodyLimit({
    maxSize: maxBytes,
    onError: (c) =>
      c.json(
        {
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request body is too large',
          },
        },
        413,
      ),
  });
}
