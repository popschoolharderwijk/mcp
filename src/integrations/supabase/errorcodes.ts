/**
 * Supabase/PostgREST can surface two different kinds of `error.code` strings:
 * - {@link PostgresErrorCodes}: PostgreSQL `SQLSTATE` from the database (e.g. `42501`).
 * - {@link PostgresApiErrorCodes}: PostgREST HTTP API codes (e.g. `PGRST202`), not `SQLSTATE`.
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

/** PostgREST / Supabase REST layer codes (`PGRST…`), not PostgreSQL `SQLSTATE`. */
export const PostgresApiErrorCodes = {
	/** Often: function missing from schema cache / not exposed for this request (e.g. after REVOKE EXECUTE). */
	RPC_SCHEMA_CACHE: 'PGRST202',
} as const;

export type PostgresApiErrorCode = (typeof PostgresApiErrorCodes)[keyof typeof PostgresApiErrorCodes];
