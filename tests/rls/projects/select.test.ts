import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
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
 * project_domains / project_labels: all authenticated users can view all records.
 * projects: admin/site_admin see all; others see only projects they own (owner_user_id = current user).
 */

async function selectProjectDomains(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('project_domains').select('*'));
	expect(data.length).toBe(fixtures.allProjectDomains.length);
	return data;
}

async function selectProjectLabels(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('project_labels').select('*'));
	expect(data.length).toBe(fixtures.allProjectLabels.length);
	return data;
}

function ownedProjectIds(user: TestUser): string[] {
	const uid = fixtures.requireUserId(user);
	return fixtures.allProjects.filter((p) => p.owner_user_id === uid).map((p) => p.id);
}

async function selectProjects(user: TestUser, expectedCount: number) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('projects').select('*'));
	expect(data.length).toBe(expectedCount);
	return data;
}

describe('RLS: project_domains SELECT', () => {
	it('site_admin sees all domains', async () => {
		await selectProjectDomains(TestUsers.SITE_ADMIN);
	});

	it('admin sees all domains', async () => {
		await selectProjectDomains(TestUsers.ADMIN_ONE);
	});

	it('staff sees all domains', async () => {
		await selectProjectDomains(TestUsers.STAFF_ONE);
	});

	it('teacher sees all domains', async () => {
		await selectProjectDomains(TestUsers.TEACHER_ALICE);
	});

	it('student sees all domains', async () => {
		await selectProjectDomains(TestUsers.STUDENT_001);
	});

	it('user without role sees all domains', async () => {
		await selectProjectDomains(TestUsers.USER_001);
	});
});

describe('RLS: project_labels SELECT', () => {
	it('site_admin sees all labels', async () => {
		await selectProjectLabels(TestUsers.SITE_ADMIN);
	});

	it('admin sees all labels', async () => {
		await selectProjectLabels(TestUsers.ADMIN_ONE);
	});

	it('staff sees all labels', async () => {
		await selectProjectLabels(TestUsers.STAFF_ONE);
	});

	it('teacher sees all labels', async () => {
		await selectProjectLabels(TestUsers.TEACHER_ALICE);
	});

	it('student sees all labels', async () => {
		await selectProjectLabels(TestUsers.STUDENT_001);
	});

	it('user without role sees all labels', async () => {
		await selectProjectLabels(TestUsers.USER_001);
	});
});

describe('RLS: projects SELECT', () => {
	it('site_admin sees all projects', async () => {
		await selectProjects(TestUsers.SITE_ADMIN, fixtures.allProjects.length);
	});

	it('admin sees all projects', async () => {
		await selectProjects(TestUsers.ADMIN_ONE, fixtures.allProjects.length);
	});

	it('staff sees only projects they own', async () => {
		const expectedIds = ownedProjectIds(TestUsers.STAFF_ONE);
		const data = await selectProjects(TestUsers.STAFF_ONE, expectedIds.length);
		expect(data.every((p) => p.owner_user_id === fixtures.requireUserId(TestUsers.STAFF_ONE))).toBe(true);
		expect(data.map((p) => p.id).sort()).toEqual([...expectedIds].sort());
	});

	it('teacher sees only projects they own', async () => {
		const expectedIds = ownedProjectIds(TestUsers.TEACHER_ALICE);
		const data = await selectProjects(TestUsers.TEACHER_ALICE, expectedIds.length);
		expect(data.every((p) => p.owner_user_id === fixtures.requireUserId(TestUsers.TEACHER_ALICE))).toBe(true);
		expect(data.map((p) => p.id).sort()).toEqual([...expectedIds].sort());
	});

	it('student sees no projects (owns none)', async () => {
		await selectProjects(TestUsers.STUDENT_001, 0);
	});

	it('user without role sees no projects (owns none)', async () => {
		await selectProjects(TestUsers.USER_001, 0);
	});
});
