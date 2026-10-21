const BACKEND =
  process.env.API_URL ||
  process.env.BACKEND_URL ||
  'https://laundromat-moolre-d87p.onrender.com';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function resolveApiPath(req) {
  // vercel.json rewrites /api/(.*) → /api/proxy?path=$1
  const raw = req.query?.path;
  let pathPart = '';
  if (Array.isArray(raw)) {
    pathPart = raw.filter(Boolean).join('/');
  } else if (typeof raw === 'string') {
    pathPart = raw;
  }

  pathPart = pathPart.replace(/^\/+/, '');

  // Ignore accidental self-target if someone hits /api/proxy directly.
  if (!pathPart || pathPart === 'proxy' || pathPart.startsWith('proxy?')) {
    return null;
  }

  // Keep a trailing slash when the client sent one (Django/Express often care).
  const wantsSlash =
    typeof raw === 'string' ? raw.endsWith('/') : Array.isArray(raw);

  let apiPath = `/api/${pathPart}`;
  if (wantsSlash && !apiPath.endsWith('/')) {
    apiPath += '/';
  }
  return apiPath;
}

// Same-origin API proxy for Vercel → Render.
// Avoids cross-origin CSRF cookie issues and external-rewrite POST 405s.
module.exports = async (req, res) => {
  try {
    const apiPath = resolveApiPath(req);
    if (!apiPath) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          message: 'API path not found.',
          error_code: 'PROXY_PATH',
        })
      );
      return;
    }

    const host = req.headers.host || 'localhost';
    const incoming = new URL(req.url || '/', `https://${host}`);
    // Drop the proxy's own ?path= query when forwarding.
    const params = new URLSearchParams(incoming.search);
    params.delete('path');
    const search = params.toString();
    const target = `${BACKEND}${apiPath}${search ? `?${search}` : ''}`;

    const forwardHeaders = {};
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (HOP_BY_HOP.has(key.toLowerCase())) continue;
      if (value == null) continue;
      forwardHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
    }

    const method = (req.method || 'GET').toUpperCase();
    let body;
    if (!['GET', 'HEAD'].includes(method)) {
      const buf = await readBody(req);
      body = buf.length ? buf : undefined;
    }

    const upstream = await fetch(target, {
      method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    res.statusCode = upstream.status;

    const setCookies =
      typeof upstream.headers.getSetCookie === 'function'
        ? upstream.headers.getSetCookie()
        : upstream.headers.get('set-cookie')
          ? [upstream.headers.get('set-cookie')]
          : [];

    if (setCookies.length) {
      // Store cookies on the Vercel host (first-party for CSRF).
      const rewritten = setCookies.map((cookie) =>
        cookie
          .replace(/;\s*Domain=[^;]*/gi, '')
          .replace(/;\s*SameSite=Strict/gi, '; SameSite=Lax')
      );
      res.setHeader('set-cookie', rewritten);
    }

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === 'set-cookie' ||
        lower === 'content-encoding' ||
        lower === 'transfer-encoding' ||
        lower === 'content-length'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('API proxy error:', err);
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        message: 'Unable to reach the API server.',
        error_code: 'PROXY_ERROR',
      })
    );
  }
};
