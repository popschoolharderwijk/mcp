import { describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

// Student 009 has agreement with Teacher Alice
// Student 010 has agreement with Teacher Alice
// Student 026 has agreement with Teacher Bob
const agreementStudent009TeacherAlice = fixtures.requireAgreementId(TestUsers.STUDENT_009, TestUsers.TEACHER_ALICE);
const agreementStudent010TeacherAlice = fixtures.requireAgreementId(TestUsers.STUDENT_010, TestUsers.TEACHER_ALICE);
const agreementStudent026TeacherBob = fixtures.requireAgreementId(TestUsers.STUDENT_026, TestUsers.TEACHER_BOB);

/**
 * Lesson agreements SELECT permissions:
 *
 * STUDENTS:
 * - Can only view their own lesson agreements (where student_user_id matches their user_id)
 *
 * TEACHERS:
 * - Can only view lesson agreements where they are the teacher (where teacher_id matches their teacher record)
 *
 * STAFF/ADMIN/SITE_ADMIN:
 * - Can view all lesson agreements
 */
describe('RLS: lesson_agreements SELECT', () => {
	it('student sees only their own agreements', async () => {
		const db = await createClientAs(TestUsers.STUDENT_009);

		const { data, error } = await db.from('lesson_agreements').select('*');

		expect(error).toBeNull();
		// Student 009 has exactly 2 agreements: one with Teacher Alice (Gitaar) and one with Teacher Diana (DJ / Beats)
		expect(data?.length).toBe(2);
		const agreementIds = data?.map((a) => a.id) ?? [];
		expect(agreementIds).toContain(agreementStudent009TeacherAlice);
		// Should NOT see agreement for Student 010
		expect(agreementIds).not.toContain(agreementStudent010TeacherAlice);
	});

	it('student cannot see other students agreements', async () => {
		const db = await createClientAs(TestUsers.STUDENT_010);

		const { data, error } = await db.from('lesson_agreements').select('*');

		expect(error).toBeNull();
		// Student 010 has exactly 2 agreements: one with Teacher Alice (Gitaar) and one with Teacher Diana (DJ / Beats)
		expect(data?.length).toBe(2);
		const agreementIds = data?.map((a) => a.id) ?? [];
		expect(agreementIds).toContain(agreementStudent010TeacherAlice);
		// Should NOT see agreements for Student 009
		expect(agreementIds).not.toContain(agreementStudent009TeacherAlice);
	});

	it('teacher sees only agreements where they are the teacher', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const { data, error } = await db.from('lesson_agreements').select('*');

		expect(error).toBeNull();
		// Teacher Alice has 28 agreements total (from seed.sql: students 009-025 with various lesson types)
		// 9 students with 1 agreement + 5 students with 2 agreements + 3 students with 3 agreements = 9 + 10 + 9 = 28
		expect(data?.length).toBe(28);
		const agreementIds = data?.map((a) => a.id) ?? [];
		expect(agreementIds).toContain(agreementStudent009TeacherAlice);
		expect(agreementIds).toContain(agreementStudent010TeacherAlice);
		// Should NOT see agreement where Teacher Bob is the teacher
		expect(agreementIds).not.toContain(agreementStudent026TeacherBob);
	});

	it('teacher cannot see agreements where they are not the teacher', async () => {
		const db = await createClientAs(TestUsers.TEACHER_BOB);

		const { data, error } = await db.from('lesson_agreements').select('*');

		expect(error).toBeNull();
		// Teacher Bob has 28 agreements total (from seed.sql: students 026-042 with Bas and Keyboard)
		// 9 students with 1 agreement + 5 students with 2 agreements + 3 students with 3 agreements = 9 + 10 + 9 = 28
		expect(data?.length).toBe(28);
		const agreementIds = data?.map((a) => a.id) ?? [];
		expect(agreementIds).toContain(agreementStudent026TeacherBob);
		// Should NOT see agreements where Teacher Alice is the teacher
		expect(agreementIds).not.toContain(agreementStudent009TeacherAlice);
		expect(agreementIds).not.toContain(agreementStudent010TeacherAlice);
	});

	it('staff sees all agreements', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		const { data, error } = await db.from('lesson_agreements').select('*');

		expect(error).toBeNull();
		// Staff should see all 184 lesson agreements (from seed.sql)
		// Total: 8 (Bandcoaching) + 28 (Alice) + 28 (Bob) + 21 (Charlie) + 21 (Diana) + 21 (Frank) + 21 (Grace) + 21 (Henry) + 15 (Iris) = 184
		expect(data?.length).toBe(184);
		const agreementIds = data?.map((a) => a.id) ?? [];
		expect(agreementIds).toContain(agreementStudent009TeacherAlice);
		expect(agreementIds).toContain(agreementStudent010TeacherAlice);
		expect(agreementIds).toContain(agreementStudent026TeacherBob);
	});

	it('admin sees all agreements', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const { data, error } = await db.from('lesson_agreements').select('*');

		expect(error).toBeNull();
		// Admin should see all 184 lesson agreements (from seed.sql)
		// Total: 8 (Bandcoaching) + 28 (Alice) + 28 (Bob) + 21 (Charlie) + 21 (Diana) + 21 (Frank) + 21 (Grace) + 21 (Henry) + 15 (Iris) = 184
		expect(data?.length).toBe(184);
		const agreementIds = data?.map((a) => a.id) ?? [];
		expect(agreementIds).toContain(agreementStudent009TeacherAlice);
		expect(agreementIds).toContain(agreementStudent010TeacherAlice);
		expect(agreementIds).toContain(agreementStudent026TeacherBob);
	});

	it('site_admin sees all agreements', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const { data, error } = await db.from('lesson_agreements').select('*');

		expect(error).toBeNull();
		// Site admin should see all 184 lesson agreements (from seed.sql)
		// Total: 8 (Bandcoaching) + 28 (Alice) + 28 (Bob) + 21 (Charlie) + 21 (Diana) + 21 (Frank) + 21 (Grace) + 21 (Henry) + 15 (Iris) = 184
		expect(data?.length).toBe(184);
		const agreementIds = data?.map((a) => a.id) ?? [];
		expect(agreementIds).toContain(agreementStudent009TeacherAlice);
		expect(agreementIds).toContain(agreementStudent010TeacherAlice);
		expect(agreementIds).toContain(agreementStudent026TeacherBob);
	});
});
