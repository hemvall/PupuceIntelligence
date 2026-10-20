import { timingSafeEqual } from 'node:crypto';
export function equalSecret(actual, expected) {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function localRequest(request, env) {
  if (env.PUPUCE_LOCAL_MODE !== 'true') return false;
  const url = new URL(request.url);
  // NextRequest normalizes loopback addresses to localhost; the original Host stays authoritative.
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol !== 'http:' || url.port !== '3210') return false;
  if (request.headers.get('host') !== '127.0.0.1:3210') return false;
  const origin = request.headers.get('origin');
  if (origin && origin !== 'http://127.0.0.1:3210') return false;
  const site = request.headers.get('sec-fetch-site');
  return !site || site === 'same-origin' || site === 'none';
}
export function localCookie(request, env) {
  if (!localRequest(request, env)) return '';
  return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('pupuce_local_access='))?.slice('pupuce_local_access='.length) || '';
}
