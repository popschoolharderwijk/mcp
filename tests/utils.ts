/**
 * Shared test utilities and helper functions.
 */

import { expect } from 'bun:test';
import type { PostgrestError, User } from '@supabase/supabase-js';
import { PostgresErrorCodes } from '../src/integrations/supabase/errorcodes';

export function expectNonNull<T>(data: T | null | undefined): asserts data is T {
	expect(data).toBeDefined();
	expect(data).not.toBeNull();
}

export function expectError<T>(data: T | null, error: PostgrestError | null): asserts error is PostgrestError {
	expect(error).not.toBeNull();
	expect(data).toBeNull();
}

export function expectNoError<T>(data: T | null | undefined, error: PostgrestError | null): asserts data is T {
	expect(error).toBeNull();
	expect(data).toBeDefined();
}

type PostgressResult<T> = {
	data: T | undefined | null;
	error: PostgrestError | null;
};

function isNonNullish<T>(value: T | null | undefined): value is NonNullable<T> {
	return value !== null && value !== undefined;
}

export function unwrap<T>({ data, error }: PostgressResult<T | null>): T {
	expectNoError(data, error);
	return data;
}

/** Like {@link unwrap}, but narrows away `null` / `undefined` (e.g. after `.single()`). */
export function unwrapSingleRow<T>(result: PostgressResult<T | null>): NonNullable<T> {
	const { data, error } = result;
	expect(error).toBeNull();
	if (!isNonNullish(data)) {
		throw new Error('unwrapSingleRow: expected a single row');
	}
	return data;
}

export function unwrapError<T>(result: PostgressResult<T>): PostgrestError {
	expectError(result.data, result.error);
	return result.error;
}

export function expectInsufficientPrivilege(error: PostgrestError): void {
	expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
}

/**
 * Helper to safely extract user from createUser response.
 * Throws if user is undefined (should never happen on successful creation).
 */
export function requireUser(data: { user: User | null }): User {
	if (!data.user) {
		throw new Error('Expected user to be defined after creation');
	}
	return data.user;
}

/**
 * Email domain for dynamically generated test users.
 * Using real domain since production Supabase rejects @example.com
 */
export const TEST_EMAIL_DOMAIN = 'popschoolharderwijk.nl';

/**
 * Generate a unique test email address.
 * Uses timestamp and random string to ensure uniqueness across test runs.
 *
 * @param prefix - Optional prefix for the email (default: 'test')
 * @returns A unique email address in the format: {prefix}-{timestamp}-{random}@popschoolharderwijk.nl
 */
export function generateTestEmail(prefix = 'test') {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@${TEST_EMAIL_DOMAIN}`;
}
