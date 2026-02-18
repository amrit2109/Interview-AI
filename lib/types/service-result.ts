/**
 * Standardized service result types.
 * Use ReadResult for reads, WriteResult for writes.
 */

export interface ReadResult<T> {
  data: T | null;
  error: string | null;
}

export interface WriteResult {
  ok: boolean;
  error?: string;
  deleted_id?: string;
  data?: unknown;
}
