/**
 * Tanat — Cloudflare Worker entry point.
 *
 * Delegates HTTP handling to the Hono application and runs the scheduled
 * maintenance pass (M-12: expire stale approvals; rate-limit table cleanup).
 */

import { app } from './app';
import { expireAllActions } from './services/action.service';
import type { Env } from './types';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          const expired = await expireAllActions(env.DB);
          console.log(`[scheduled] expired ${expired} stale actions`);
        } catch (err) {
          console.error('[scheduled] failed to expire actions', err);
        }

        try {
          await env.DB.prepare(
            "DELETE FROM rate_limits WHERE window_start < (strftime('%s','now') * 1000) - 3600000",
          ).run();
        } catch (err) {
          console.error('[scheduled] failed to prune rate limits', err);
        }
      })(),
    );
  },
};
