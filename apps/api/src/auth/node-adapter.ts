import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { IncomingHttpHeaders } from 'http';
import type { auth as AuthInstance } from './auth.config';

/**
 * Minimal Node <-> Web (Fetch) adapters for Better Auth.
 *
 * We intentionally do NOT use `better-auth/node` (toNodeHandler/fromNodeHeaders)
 * because that subpath is ESM-only (node.mjs). Our API compiles to CommonJS, and
 * Vercel's bundler resolves it to the .mjs file, so `require()`-ing it throws
 * ERR_REQUIRE_ESM at runtime. These inlined helpers use the global Fetch API
 * (available on Node 20+) and the `auth.handler` / `auth.api` surface from the
 * main `better-auth` package (which is CommonJS-friendly).
 */

export function headersFromNode(nodeHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const v of value) headers.append(key, v);
    else headers.append(key, value);
  }
  return headers;
}

async function readRawBody(req: ExpressRequest): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function webRequestFromNode(req: ExpressRequest): Promise<Request> {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol || 'https';
  const host = req.get('host') ?? 'localhost';
  const url = `${proto}://${host}${req.originalUrl}`;
  const body = await readRawBody(req);
  return new Request(url, {
    method: req.method,
    headers: headersFromNode(req.headers),
    body: body && body.length ? body : undefined,
    // `duplex` is required by Node when sending a body; harmless otherwise.
    ...(body && body.length ? { duplex: 'half' } : {}),
  } as RequestInit);
}

async function writeWebResponse(webRes: Response, res: ExpressResponse): Promise<void> {
  res.status(webRes.status);
  const setCookies = (webRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return; // handled below (may be multiple)
    res.setHeader(key, value);
  });
  if (setCookies.length) res.setHeader('set-cookie', setCookies);
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}

/** Mount Better Auth's web handler onto an Express app at /api/auth/*. */
export function mountBetterAuth(
  server: { all: (path: string, handler: (req: ExpressRequest, res: ExpressResponse) => void) => void },
  auth: typeof AuthInstance,
): void {
  server.all('/api/auth/*', (req: ExpressRequest, res: ExpressResponse) => {
    void (async () => {
      try {
        const webReq = await webRequestFromNode(req);
        const webRes = await auth.handler(webReq);
        await writeWebResponse(webRes, res);
      } catch {
        if (!res.headersSent) res.status(500).json({ message: 'Authentication error' });
      }
    })();
  });
}
