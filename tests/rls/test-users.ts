import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Test user UUIDs matching the seed data in supabase/seed.sql
 *
 * These UUIDs are used consistently across:
 * - Database seed (auth.users, profiles, user_roles, teacher_students)
 * - RLS behavior tests
 */
export const TEST_USERS = {
	// Students
	STUDENT_1: "11111111-1111-1111-1111-111111111111",
	STUDENT_2: "11111111-1111-1111-1111-222222222222",

	// Teachers
	TEACHER_1: "22222222-2222-2222-2222-222222222222",
	TEACHER_2: "22222222-2222-2222-2222-333333333333",

	// Staff
	STAFF_1: "33333333-3333-3333-3333-333333333333",

	// Admin
	ADMIN: "44444444-4444-4444-4444-444444444444",

	// Site Admin
	SITE_ADMIN: "55555555-5555-5555-5555-555555555555",
} as const;

/**
 * Teacher-student relationships from seed data
 */
export const TEACHER_STUDENT_LINKS = {
	// Teacher 1 has both students
	TEACHER_1: [TEST_USERS.STUDENT_1, TEST_USERS.STUDENT_2],
	// Teacher 2 has only student 2
	TEACHER_2: [TEST_USERS.STUDENT_2],
} as const;

/**
 * Execute a SELECT query as a specific user using JWT claim injection.
 *
 * This function calls the run_as_user database function which:
 * - Only accepts SELECT statements
 * - Injects JWT claims to simulate the specified user
 * - Returns results as JSONB array
 *
 * @param supabase - Supabase client (must use service_role key)
 * @param userId - UUID of the user to impersonate
 * @param query - SELECT statement to execute
 * @returns Array of result rows
 * @throws Error if query fails or is not a SELECT statement
 */
export async function queryAs<T>(
	supabase: SupabaseClient,
	userId: string,
	query: string,
): Promise<T[]> {
	const { data, error } = await supabase.rpc("run_as_user", {
		_user_id: userId,
		_query: query,
	});

	if (error) {
		throw new Error(`queryAs failed: ${error.message}`);
	}

	return (data as T[]) ?? [];
}

/**
 * Type helper for profile query results
 */
export interface ProfileRow {
	user_id: string;
	display_name: string | null;
	avatar_url: string | null;
}

/**
 * Type helper for user_roles query results
 */
export interface UserRoleRow {
	user_id: string;
	role: "student" | "teacher" | "staff" | "admin" | "site_admin";
}

/**
 * Type helper for teacher_students query results
 */
export interface TeacherStudentRow {
	teacher_id: string;
	student_id: string;
}
