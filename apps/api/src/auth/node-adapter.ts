import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { IncomingHttpHeaders } from 'http';
import type { Auth } from './auth.config';

/**
 * Minimal Node <-> Web (Fetch) adapters for Better Auth.
 *
 * We intentionally do NOT use `better-auth/node` (toNodeHandler/fromNodeHeaders):
 * that subpath is ESM-only (node.mjs), and our CommonJS build `require()`s it on
 * Vercel, throwing ERR_REQUIRE_ESM. These helpers use the global Fetch API
 * (Node 20+) instead. The response is described structurally so the code
 * compiles regardless of the exact `Response` lib type the build resolves.
 */

interface WebResponse {
  status: number;
  headers: {
    forEach(cb: (value: string, key: string) => void): void;
    getSetCookie?(): string[];
  };
  arrayBuffer(): Promise<ArrayBuffer>;
}

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
  const init: Record<string, unknown> = {
    method: req.method,
    headers: headersFromNode(req.headers),
  };
  if (body && body.length) {
    init.body = body;
    init.duplex = 'half';
  }
  return new Request(url, init as RequestInit);
}

async function writeWebResponse(webRes: WebResponse, res: ExpressResponse): Promise<void> {
  res.status(webRes.status);
  const setCookies = webRes.headers.getSetCookie?.() ?? [];
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
  auth: Auth,
): void {
  const handler = auth.handler as unknown as (request: Request) => Promise<WebResponse>;
  server.all('/api/auth/*', (req: ExpressRequest, res: ExpressResponse) => {
    void (async () => {
      try {
        const webReq = await webRequestFromNode(req);
        const webRes = await handler(webReq);
        await writeWebResponse(webRes, res);
      } catch {
        if (!res.headersSent) res.status(500).json({ message: 'Authentication error' });
      }
    })();
  });
}
