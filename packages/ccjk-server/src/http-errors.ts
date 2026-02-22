import type { FastifyReply } from 'fastify';

export type UnifiedErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export function mapStatusToUnifiedCode(statusCode: number): UnifiedErrorCode {
  switch (statusCode) {
    case 400:
      return 'INVALID_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'INTERNAL_ERROR';
  }
}

export function sendMappedError(reply: FastifyReply, statusCode: number, message: string) {
  const code = mapStatusToUnifiedCode(statusCode);
  return reply.status(statusCode).send({
    code,
    message,
  });
}
