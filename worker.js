addEventListener('fetch', event => {
  event.respondWith(handle(event));
});

const PULSOID_API = 'https://dev.pulsoid.net/api/v1/data/heart_rate/latest?response_mode=text_plain_only_heart_rate';

// Set CORS headers. For production, replace '*' with your Pages origin to be more secure.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function handle(event) {
  const req = event.request;
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  // Example route check — adjust if you mount worker on a specific route
  // Accept /heart or root (/) — you can use your worker route instead
  if (!url.pathname.endsWith('/heart') && url.pathname !== '/') {
    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  }

  try {
    // Use the secret binding PULSOID_TOKEN — set via dashboard or wrangler secret put
    const pulsoidRes = await fetch(PULSOID_API, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + PULSOID_TOKEN,
        // Do not set Accept or Content-Type forcibly — allow Pulsoid to respond
      },
    });

    // Read response body as ArrayBuffer so we can pass it through exactly
    const body = await pulsoidRes.arrayBuffer();

    // Build response headers: include content-type from Pulsoid (if present)
    const outHeaders = new Headers();
    const ct = pulsoidRes.headers.get('content-type');
    if (ct) outHeaders.set('Content-Type', ct);
    // set CORS headers
    for (const [k, v] of Object.entries(CORS_HEADERS)) outHeaders.set(k, v);

    return new Response(body, {
      status: pulsoidRes.status,
      headers: outHeaders
    });
  } catch (err) {
    // network or other error
    const msg = 'proxy error';
    return new Response(msg + ': ' + String(err), { status: 502, headers: CORS_HEADERS });
  }
}
