import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Vercel serverless function entry. Vercel routes all requests here (see
 * vercel.json) and we hand them to the cached Nest/Express app.
 *
 * We require the COMPILED output (../dist/serverless.js) rather than the TS
 * source so NestJS decorator metadata is emitted by `nest build` (run in the
 * Vercel buildCommand) instead of Vercel's esbuild, which does not emit it.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getApp } = require('../dist/serverless.js');
  const app = await getApp();
  app(req, res); // the Express app is itself a (req, res) handler
}
