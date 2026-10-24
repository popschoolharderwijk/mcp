import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { addDaysFromNow } from '../../../src/lib/date/date-format';
import { createClientAs } from '../../db';
import type { AnnouncementInsert } from '../../types';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { ANNOUNCEMENTS } from '../seed-data-constants';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * announcements SELECT:
 *   privileged (staff/admin/site_admin): every row
 *   everyone else: only rows with is_active = true AND published_at <= now()
 */

const SORTED_SEED_IDS = [ANNOUNCEMENTS.PUBLISHED_ID, ANNOUNCEMENTS.DRAFT_ID].sort();

async function expectSeesOnlyPublished(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('announcements').select('id'));
	expect(data).toEqual([{ id: ANNOUNCEMENTS.PUBLISHED_ID }]);
}

async function expectSeesAll(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('announcements').select('id').order('id'));
	expect(data.map((row) => row.id)).toEqual(SORTED_SEED_IDS);
}

describe('RLS: announcements SELECT - privileged see every row', () => {
	it('site_admin sees published and draft announcements', async () => {
		await expectSeesAll(TestUsers.SITE_ADMIN);
	});

	it('admin sees published and draft announcements', async () => {
		await expectSeesAll(TestUsers.ADMIN_ONE);
	});

	it('staff sees published and draft announcements', async () => {
		await expectSeesAll(TestUsers.STAFF_ONE);
	});
});

describe('RLS: announcements SELECT - others see only published', () => {
	it('teacher sees only the published announcement', async () => {
		await expectSeesOnlyPublished(TestUsers.TEACHER_ALICE);
	});

	it('student sees only the published announcement', async () => {
		await expectSeesOnlyPublished(TestUsers.STUDENT_001);
	});

	it('user without role sees only the published announcement', async () => {
		await expectSeesOnlyPublished(TestUsers.USER_001);
	});
});

describe('RLS: announcements SELECT - publish filter', () => {
	it('student does not see future-scheduled or inactive announcements', async () => {
		const staff = await createClientAs(TestUsers.STAFF_ONE);
		const student = await createClientAs(TestUsers.STUDENT_001);
		const rows: AnnouncementInsert[] = [
			{ title: 'RLS gepland', body: 'Toekomst', published_at: addDaysFromNow(1).toISOString(), is_active: true },
			{ title: 'RLS inactief', body: 'Uit', published_at: addDaysFromNow(-1).toISOString(), is_active: false },
		];

		const inserted = unwrap(await staff.from('announcements').insert(rows).select('id'));
		const insertedIds = inserted.map((row) => row.id);
		const studentView = unwrap(await student.from('announcements').select('id'));
		const staffView = unwrap(await staff.from('announcements').select('id'));
		const deleted = unwrap(await staff.from('announcements').delete().in('id', insertedIds).select('id'));

		expect(studentView).toEqual([{ id: ANNOUNCEMENTS.PUBLISHED_ID }]);
		expect(staffView).toHaveLength(ANNOUNCEMENTS.TOTAL + rows.length);
		expect(deleted).toHaveLength(rows.length);
	});
});
