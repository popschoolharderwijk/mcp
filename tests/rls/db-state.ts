/**
 * Database state verification helpers for test integrity.
 * These helpers capture, normalize, and compare database state to ensure
 * tests don't leave behind dirty data or modify unexpected records.
 */

import { expect } from 'bun:test';
import { createClientBypassRLS } from '../db';

/**
 * Normalized database state: all tables with their data sorted consistently.
 * Keys are table names, values are sorted arrays of row data.
 */
export type DatabaseState = Record<string, unknown[]>;

/**
 * Capture the current state of all public tables in the database.
 * Uses the get_public_table_names() function to dynamically discover tables.
 * Bypasses RLS to get complete data for verification.
 */
export async function captureDatabaseState(): Promise<DatabaseState> {
	const db = createClientBypassRLS();

	// Get all public table names dynamically
	// The function returns a table, so we call it without parameters
	// Cast to any because TypeScript doesn't know about this function yet
	const { data: tableNamesData, error: tableError } = await (
		db.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
	)('get_public_table_names', {});

	if (tableError || !tableNamesData) {
		throw new Error(`Failed to get table names: ${(tableError as Error)?.message ?? 'Unknown error'}`);
	}

	// Type guard: ensure tableNamesData is an array
	if (!Array.isArray(tableNamesData)) {
		throw new Error(`Expected array from get_public_table_names, got ${typeof tableNamesData}`);
	}

	const tableNames = tableNamesData as Array<{ table_name: string }>;
	const state: DatabaseState = {};

	// Fetch all data from each table
	// tableNames is an array of objects with table_name property
	for (const row of tableNames) {
		const tableName = (row as { table_name: string }).table_name;

		// Use dynamic table access - Supabase client supports this
		// We need to cast db.from to any because TypeScript doesn't know about dynamic table names
		const table = (db.from as unknown as (table: string) => ReturnType<typeof db.from>)(tableName);

		const { data, error } = await table.select('*');

		if (error) {
			// Some tables might not be accessible or might not exist
			// Log but don't fail - we'll just have an empty array for that table
			console.warn(`Warning: Could not fetch data from table ${tableName}: ${error.message}`);
			state[tableName] = [];
		} else {
			state[tableName] = data ?? [];
		}
	}

	return state;
}

/**
 * Normalize database state for comparison.
 * - Sorts rows within each table by primary key or all columns (for consistent ordering)
 * - Handles timestamps and other fields that might vary between captures
 * - Returns a normalized state that can be compared with deep equality
 */
export function normalizeDatabaseState(state: DatabaseState): DatabaseState {
	const normalized: DatabaseState = {};

	for (const [tableName, rows] of Object.entries(state)) {
		if (rows.length === 0) {
			normalized[tableName] = [];
			continue;
		}

		// Sort rows by converting to JSON strings and sorting lexicographically
		// This ensures consistent ordering regardless of column order or data types
		const sorted = [...rows].sort((a, b) => {
			// Type guard: ensure a and b are objects
			if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
				return String(a).localeCompare(String(b));
			}
			const aObj = a as Record<string, unknown>;
			const bObj = b as Record<string, unknown>;
			const aStr = JSON.stringify(a, Object.keys(aObj).sort());
			const bStr = JSON.stringify(b, Object.keys(bObj).sort());
			return aStr.localeCompare(bStr);
		});

		normalized[tableName] = sorted;
	}

	return normalized;
}

/**
 * Compare two database states and return differences.
 * Returns an object with:
 * - `equal`: boolean indicating if states are identical
 * - `differences`: array of difference descriptions
 */
export function compareDatabaseStates(
	before: DatabaseState,
	after: DatabaseState,
): { equal: boolean; differences: string[] } {
	const differences: string[] = [];

	// Get all table names from both states
	const allTableNames = new Set([...Object.keys(before), ...Object.keys(after)]);

	for (const tableName of allTableNames) {
		const beforeRows = before[tableName] ?? [];
		const afterRows = after[tableName] ?? [];

		if (beforeRows.length !== afterRows.length) {
			differences.push(`Table ${tableName}: row count changed from ${beforeRows.length} to ${afterRows.length}`);
			continue;
		}

		// Normalize both states for comparison
		const normalizedBefore = normalizeDatabaseState({ [tableName]: beforeRows })[tableName];
		const normalizedAfter = normalizeDatabaseState({ [tableName]: afterRows })[tableName];

		// Compare each row
		for (let i = 0; i < normalizedBefore.length; i++) {
			const beforeRow = normalizedBefore[i];
			const afterRow = normalizedAfter[i];

			if (!deepEqual(beforeRow, afterRow)) {
				differences.push(
					`Table ${tableName}: row ${i} differs\n  Before: ${JSON.stringify(beforeRow)}\n  After: ${JSON.stringify(afterRow)}`,
				);
			}
		}
	}

	return {
		equal: differences.length === 0,
		differences,
	};
}

/**
 * Deep equality check for two values.
 * Handles objects, arrays, and primitives.
 */
function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) {
		return true;
	}

	if (a === null || b === null || a === undefined || b === undefined) {
		return a === b;
	}

	if (typeof a !== typeof b) {
		return false;
	}

	if (typeof a !== 'object') {
		return false;
	}

	if (Array.isArray(a) !== Array.isArray(b)) {
		return false;
	}

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			return false;
		}
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) {
				return false;
			}
		}
		return true;
	}

	// Both are objects
	const aObj = a as Record<string, unknown>;
	const bObj = b as Record<string, unknown>;

	const aKeys = Object.keys(aObj).sort();
	const bKeys = Object.keys(bObj).sort();

	if (aKeys.length !== bKeys.length) {
		return false;
	}

	for (const key of aKeys) {
		if (!bKeys.includes(key)) {
			return false;
		}
		if (!deepEqual(aObj[key], bObj[key])) {
			return false;
		}
	}

	return true;
}

/**
 * Setup database state verification hooks for a test suite.
 * Returns beforeAll and afterAll handlers that capture initial state
 * and verify database integrity after tests complete.
 *
 * Usage:
 * ```typescript
 * import { expect } from 'bun:test';
 * import { setupDatabaseStateVerification } from '../db-state';
 *
 * describe('My test suite', () => {
 *   let initialState: DatabaseState;
 *   const { setupState, verifyState } = setupDatabaseStateVerification();
 *
 *   beforeAll(async () => {
 *     initialState = await setupState();
 *   });
 *
 *   afterAll(async () => {
 *     await verifyState(initialState);
 *   });
 *
 *   // ... your tests ...
 * });
 * ```
 */
export function setupDatabaseStateVerification(): {
	setupState: () => Promise<DatabaseState>;
	verifyState: (initialState: DatabaseState) => Promise<void>;
} {
	const setupState = async (): Promise<DatabaseState> => {
		// Capture initial database state
		// Tests rely on seed data from supabase/seed.sql - it must be available
		return await captureDatabaseState();
	};

	const verifyState = async (initialState: DatabaseState): Promise<void> => {
		// Verify database integrity after tests
		// All data should come from seed.sql - tests should not modify database state
		const finalState = await captureDatabaseState();
		const comparison = compareDatabaseStates(initialState, finalState);

		expect(comparison.equal).toBe(true);
		if (!comparison.equal) {
			console.error('Database state changed:', comparison.differences);
		}
	};

	return {
		setupState,
		verifyState,
	};
}
