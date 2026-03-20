/**
 * Supabase/PostgREST can surface different `error.code` strings:
 * - PostgreSQL `SQLSTATE` (e.g. `42501`) — {@link PostgresErrorCodes}.
 * - PostgREST API codes (e.g. `PGRST202`), not SQLSTATE — see PostgREST error reference.
 *
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 * @see https://postgrest.org/en/stable/errors.html
 */

/** PostgreSQL `SQLSTATE` values (5-character codes from the server). */
export const PostgresErrorCodes = {
	INSUFFICIENT_PRIVILEGE: '42501',
	UNIQUE_VIOLATION: '23505',
	FOREIGN_KEY_VIOLATION: '23503',
	NOT_NULL_VIOLATION: '23502',
	CHECK_VIOLATION: '23514',
} as const;

export type PostgresErrorCode = (typeof PostgresErrorCodes)[keyof typeof PostgresErrorCodes];
