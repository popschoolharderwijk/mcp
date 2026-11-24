import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();
const dbNoRLS = createClientBypassRLS();

/** 1×1 PNG — enough for storage upload without depending on local fixtures. */
const AVATAR_PNG = Uint8Array.from(
	atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
	(c) => c.charCodeAt(0),
);

const CONTENT_TYPE = 'image/png';

function avatarPath(userId: string): string {
	return `${userId}.png`;
}

async function removeAvatarPaths(paths: string[]): Promise<void> {
	if (paths.length === 0) return;
	await dbNoRLS.storage.from('avatars').remove(paths);
}

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await removeAvatarPaths([
		avatarPath(fixtures.requireUserId(TestUsers.STUDENT_001)),
		avatarPath(fixtures.requireUserId(TestUsers.STUDENT_002)),
		avatarPath(fixtures.requireUserId(TestUsers.SITE_ADMIN)),
	]);
	await verifyState(initialState);
});

describe('RLS: avatars storage - own avatar lifecycle', () => {
	it('user can upload, overwrite with upsert, update avatar_url, and delete own avatar', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const userId = fixtures.requireUserId(TestUsers.STUDENT_001);
		const path = avatarPath(userId);
		const originalAvatarUrl = fixtures.requireProfile(TestUsers.STUDENT_001).avatar_url;

		await removeAvatarPaths([path]);

		const { error: insertError } = await db.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: false,
		});
		expect(insertError).toBeNull();

		const { error: upsertError } = await db.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: true,
		});
		expect(upsertError).toBeNull();

		const {
			data: { publicUrl },
		} = db.storage.from('avatars').getPublicUrl(path);
		const avatarUrl = `${publicUrl}?t=1`;

		const updated = unwrap(
			await db.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', userId).select('avatar_url'),
		);
		expect(updated).toEqual([{ avatar_url: avatarUrl }]);

		const { error: deleteError } = await db.storage.from('avatars').remove([path]);
		expect(deleteError).toBeNull();

		unwrap(
			await db.from('profiles').update({ avatar_url: originalAvatarUrl }).eq('user_id', userId).select('user_id'),
		);
	});

	it('site_admin can upload and upsert own avatar', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const userId = fixtures.requireUserId(TestUsers.SITE_ADMIN);
		const path = avatarPath(userId);

		await removeAvatarPaths([path]);

		const { error: insertError } = await db.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: false,
		});
		expect(insertError).toBeNull();

		const { error: upsertError } = await db.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: true,
		});
		expect(upsertError).toBeNull();

		const { error: deleteError } = await db.storage.from('avatars').remove([path]);
		expect(deleteError).toBeNull();
	});
});

describe('RLS: avatars storage - other users', () => {
	it('student cannot upload or delete another student avatar', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const otherId = fixtures.requireUserId(TestUsers.STUDENT_002);
		const path = avatarPath(otherId);

		await removeAvatarPaths([path]);

		const { error: uploadError } = await db.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: true,
		});
		expect(uploadError).not.toBeNull();

		const { error: seedError } = await dbNoRLS.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: true,
		});
		expect(seedError).toBeNull();

		await db.storage.from('avatars').remove([path]);

		const stillThere = await dbNoRLS.storage.from('avatars').list('', { search: path });
		expect(stillThere.error).toBeNull();
		expect(stillThere.data?.some((obj) => obj.name === path)).toBe(true);

		await removeAvatarPaths([path]);
	});

	it('teacher cannot upload a student avatar', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const studentId = fixtures.requireUserId(TestUsers.STUDENT_001);
		const path = avatarPath(studentId);

		await removeAvatarPaths([path]);

		const { error: uploadError } = await db.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: true,
		});
		expect(uploadError).not.toBeNull();
	});

	it('admin can upload, upsert, and delete another user avatar', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const studentId = fixtures.requireUserId(TestUsers.STUDENT_002);
		const path = avatarPath(studentId);
		const originalAvatarUrl = fixtures.requireProfile(TestUsers.STUDENT_002).avatar_url;

		await removeAvatarPaths([path]);

		const { error: insertError } = await db.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: false,
		});
		expect(insertError).toBeNull();

		const { error: upsertError } = await db.storage.from('avatars').upload(path, AVATAR_PNG, {
			contentType: CONTENT_TYPE,
			upsert: true,
		});
		expect(upsertError).toBeNull();

		const {
			data: { publicUrl },
		} = db.storage.from('avatars').getPublicUrl(path);
		const avatarUrl = `${publicUrl}?t=2`;

		const updated = unwrap(
			await db.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', studentId).select('avatar_url'),
		);
		expect(updated).toEqual([{ avatar_url: avatarUrl }]);

		const { error: deleteError } = await db.storage.from('avatars').remove([path]);
		expect(deleteError).toBeNull();

		unwrap(
			await db
				.from('profiles')
				.update({ avatar_url: originalAvatarUrl })
				.eq('user_id', studentId)
				.select('user_id'),
		);
	});
});
