import { describe, expect, it } from "bun:test";
import { createTestDb } from "./db";
import {
	type ProfileRow,
	TEACHER_STUDENT_LINKS,
	type TeacherStudentRow,
	TEST_USERS,
	type UserRoleRow,
	queryAs,
} from "./test-users";

const supabase = createTestDb();

// ============================================================================
// BASELINE: Verify seed data is correct
// ============================================================================
describe("Baseline - Seed Data Verification", () => {
	it("should have 7 users seeded", async () => {
		const { data, error } = await supabase.from("user_roles").select("user_id");
		expect(error).toBeNull();
		expect(data?.length).toBe(7);
	});

	it("should have correct role assignments", async () => {
		const { data, error } = await supabase
			.from("user_roles")
			.select("user_id, role");
		expect(error).toBeNull();

		const roleMap = new Map(data?.map((r) => [r.user_id, r.role]));
		expect(roleMap.get(TEST_USERS.STUDENT_1)).toBe("student");
		expect(roleMap.get(TEST_USERS.STUDENT_2)).toBe("student");
		expect(roleMap.get(TEST_USERS.TEACHER_1)).toBe("teacher");
		expect(roleMap.get(TEST_USERS.TEACHER_2)).toBe("teacher");
		expect(roleMap.get(TEST_USERS.STAFF_1)).toBe("staff");
		expect(roleMap.get(TEST_USERS.ADMIN)).toBe("admin");
		expect(roleMap.get(TEST_USERS.SITE_ADMIN)).toBe("site_admin");
	});

	it("should have correct teacher-student links", async () => {
		const { data, error } = await supabase
			.from("teacher_students")
			.select("teacher_id, student_id");
		expect(error).toBeNull();
		expect(data?.length).toBe(3);
	});
});

// ============================================================================
// PROFILES: SELECT policies
// ============================================================================
describe("RLS Behavior: Profiles SELECT", () => {
	it("student can only see their own profile", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.STUDENT_1,
			"SELECT user_id FROM profiles",
		);
		expect(profiles.length).toBe(1);
		expect(profiles[0].user_id).toBe(TEST_USERS.STUDENT_1);
	});

	it("student cannot see another student's profile", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.STUDENT_1,
			`SELECT user_id FROM profiles WHERE user_id = '${TEST_USERS.STUDENT_2}'`,
		);
		expect(profiles.length).toBe(0);
	});

	it("student cannot see admin profile", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.STUDENT_1,
			`SELECT user_id FROM profiles WHERE user_id = '${TEST_USERS.ADMIN}'`,
		);
		expect(profiles.length).toBe(0);
	});

	it("teacher can see own profile", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.TEACHER_1,
			`SELECT user_id FROM profiles WHERE user_id = '${TEST_USERS.TEACHER_1}'`,
		);
		expect(profiles.length).toBe(1);
	});

	it("teacher can see their linked students", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.TEACHER_1,
			"SELECT user_id FROM profiles",
		);

		const userIds = profiles.map((p) => p.user_id);

		// Teacher 1 should see: own profile + student 1 + student 2
		expect(userIds).toContain(TEST_USERS.TEACHER_1);
		expect(userIds).toContain(TEST_USERS.STUDENT_1);
		expect(userIds).toContain(TEST_USERS.STUDENT_2);

		// Teacher 1 should NOT see: admin, site_admin, staff, teacher 2
		expect(userIds).not.toContain(TEST_USERS.ADMIN);
		expect(userIds).not.toContain(TEST_USERS.SITE_ADMIN);
		expect(userIds).not.toContain(TEST_USERS.STAFF_1);
		expect(userIds).not.toContain(TEST_USERS.TEACHER_2);
	});

	it("teacher 2 can only see student 2 (not student 1)", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.TEACHER_2,
			"SELECT user_id FROM profiles",
		);

		const userIds = profiles.map((p) => p.user_id);

		// Teacher 2 should see: own profile + student 2 only
		expect(userIds).toContain(TEST_USERS.TEACHER_2);
		expect(userIds).toContain(TEST_USERS.STUDENT_2);
		expect(userIds).not.toContain(TEST_USERS.STUDENT_1);
	});

	it("staff can see all profiles", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.STAFF_1,
			"SELECT user_id FROM profiles",
		);
		expect(profiles.length).toBe(7);
	});

	it("admin can see all profiles", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.ADMIN,
			"SELECT user_id FROM profiles",
		);
		expect(profiles.length).toBe(7);
	});

	it("site_admin can see all profiles", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.SITE_ADMIN,
			"SELECT user_id FROM profiles",
		);
		expect(profiles.length).toBe(7);
	});
});

// ============================================================================
// USER_ROLES: SELECT policies
// ============================================================================
describe("RLS Behavior: User Roles SELECT", () => {
	it("student can only see their own role", async () => {
		const roles = await queryAs<UserRoleRow>(
			supabase,
			TEST_USERS.STUDENT_1,
			"SELECT user_id, role FROM user_roles",
		);
		expect(roles.length).toBe(1);
		expect(roles[0].user_id).toBe(TEST_USERS.STUDENT_1);
		expect(roles[0].role).toBe("student");
	});

	it("student cannot see admin's role", async () => {
		const roles = await queryAs<UserRoleRow>(
			supabase,
			TEST_USERS.STUDENT_1,
			`SELECT user_id, role FROM user_roles WHERE user_id = '${TEST_USERS.ADMIN}'`,
		);
		expect(roles.length).toBe(0);
	});

	it("teacher can see own role and linked students' roles", async () => {
		const roles = await queryAs<UserRoleRow>(
			supabase,
			TEST_USERS.TEACHER_1,
			"SELECT user_id, role FROM user_roles",
		);

		const userIds = roles.map((r) => r.user_id);

		// Teacher 1 should see: own role + student 1 + student 2
		expect(userIds).toContain(TEST_USERS.TEACHER_1);
		expect(userIds).toContain(TEST_USERS.STUDENT_1);
		expect(userIds).toContain(TEST_USERS.STUDENT_2);

		// Teacher 1 should NOT see non-student roles
		expect(userIds).not.toContain(TEST_USERS.ADMIN);
		expect(userIds).not.toContain(TEST_USERS.STAFF_1);
	});

	it("staff can see all roles", async () => {
		const roles = await queryAs<UserRoleRow>(
			supabase,
			TEST_USERS.STAFF_1,
			"SELECT user_id FROM user_roles",
		);
		expect(roles.length).toBe(7);
	});

	it("admin can see all roles", async () => {
		const roles = await queryAs<UserRoleRow>(
			supabase,
			TEST_USERS.ADMIN,
			"SELECT user_id FROM user_roles",
		);
		expect(roles.length).toBe(7);
	});
});

// ============================================================================
// TEACHER_STUDENTS: SELECT policies
// ============================================================================
describe("RLS Behavior: Teacher-Students SELECT", () => {
	it("student cannot see any teacher-student links", async () => {
		const links = await queryAs<TeacherStudentRow>(
			supabase,
			TEST_USERS.STUDENT_1,
			"SELECT teacher_id, student_id FROM teacher_students",
		);
		expect(links.length).toBe(0);
	});

	it("teacher can only see their own student links", async () => {
		const links = await queryAs<TeacherStudentRow>(
			supabase,
			TEST_USERS.TEACHER_1,
			"SELECT teacher_id, student_id FROM teacher_students",
		);

		// Teacher 1 has 2 students
		expect(links.length).toBe(2);
		expect(links.every((l) => l.teacher_id === TEST_USERS.TEACHER_1)).toBe(
			true,
		);

		const studentIds = links.map((l) => l.student_id);
		expect(studentIds).toContain(TEST_USERS.STUDENT_1);
		expect(studentIds).toContain(TEST_USERS.STUDENT_2);
	});

	it("teacher cannot see another teacher's links", async () => {
		const links = await queryAs<TeacherStudentRow>(
			supabase,
			TEST_USERS.TEACHER_1,
			`SELECT teacher_id, student_id FROM teacher_students WHERE teacher_id = '${TEST_USERS.TEACHER_2}'`,
		);
		expect(links.length).toBe(0);
	});

	it("admin cannot see teacher-student links (no policy)", async () => {
		// The teacher_students table only has teacher_students_manage_own policy
		// Admin has no special access to this table
		const links = await queryAs<TeacherStudentRow>(
			supabase,
			TEST_USERS.ADMIN,
			"SELECT teacher_id, student_id FROM teacher_students",
		);
		expect(links.length).toBe(0);
	});
});

// ============================================================================
// CROSS-ROLE ISOLATION: Verify strict boundaries
// ============================================================================
describe("RLS Behavior: Cross-Role Isolation", () => {
	it("teacher cannot see staff profile", async () => {
		const profiles = await queryAs<ProfileRow>(
			supabase,
			TEST_USERS.TEACHER_1,
			`SELECT user_id FROM profiles WHERE user_id = '${TEST_USERS.STAFF_1}'`,
		);
		expect(profiles.length).toBe(0);
	});

	it("staff cannot see teacher-student links", async () => {
		const links = await queryAs<TeacherStudentRow>(
			supabase,
			TEST_USERS.STAFF_1,
			"SELECT teacher_id, student_id FROM teacher_students",
		);
		expect(links.length).toBe(0);
	});

	it("non-existent user sees nothing", async () => {
		const fakeUserId = "99999999-9999-9999-9999-999999999999";

		const profiles = await queryAs<ProfileRow>(
			supabase,
			fakeUserId,
			"SELECT user_id FROM profiles",
		);
		expect(profiles.length).toBe(0);

		const roles = await queryAs<UserRoleRow>(
			supabase,
			fakeUserId,
			"SELECT user_id FROM user_roles",
		);
		expect(roles.length).toBe(0);
	});
});
