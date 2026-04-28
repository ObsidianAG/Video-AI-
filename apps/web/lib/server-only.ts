import 'server-only';

/**
 * Re-export this file (or import 'server-only') from any module that loads
 * provider keys, storage credentials, queue connection strings, or any other
 * server-only secret. Importing into a client component will hard-fail the
 * build, which is what we want.
 */
export const SERVER_BOUNDARY = Symbol.for('@video-ai/web.server-boundary');
