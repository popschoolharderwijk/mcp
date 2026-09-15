import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { ChangeEvent } from 'react';
import type { AccountProfileState } from '../../../src/lib/account/persistence';
import * as persistence from '../../../src/lib/account/persistence';

const toastCalls: { kind: 'error' | 'success'; message: string; description?: string }[] = [];

mock.module('sonner', () => ({
	toast: {
		error: (message: string, options?: { description?: string }) => {
			toastCalls.push({ kind: 'error', message, description: options?.description });
		},
		success: (message: string) => {
			toastCalls.push({ kind: 'success', message });
		},
	},
}));

function createFileList(file: File): FileList {
	return {
		length: 1,
		item: (index: number) => (index === 0 ? file : null),
		0: file,
		*[Symbol.iterator]() {
			yield file;
		},
	} as unknown as FileList;
}

describe('accountActionsHelpers', () => {
	let helpers: typeof import('../../../src/lib/account/accountActionsHelpers');
	let persistProfileSpy: ReturnType<typeof spyOn>;
	let persistAvatarUploadSpy: ReturnType<typeof spyOn>;
	let dispatchProfileUpdatedSpy: ReturnType<typeof spyOn>;

	beforeAll(async () => {
		helpers = await import('../../../src/lib/account/accountActionsHelpers');
	});

	beforeEach(() => {
		toastCalls.length = 0;
		persistProfileSpy = spyOn(persistence, 'persistProfile').mockResolvedValue({ error: null });
		persistAvatarUploadSpy = spyOn(persistence, 'persistAvatarUpload').mockResolvedValue({
			error: null,
			avatarUrl: null,
		});
		dispatchProfileUpdatedSpy = spyOn(persistence, 'dispatchProfileUpdated').mockImplementation(() => {});
	});

	afterEach(() => {
		persistProfileSpy.mockRestore();
		persistAvatarUploadSpy.mockRestore();
		dispatchProfileUpdatedSpy.mockRestore();
	});

	describe('resolveDeleteAccountToastKind', () => {
		it('maps known delete account errors', () => {
			expect(helpers.resolveDeleteAccountToastKind('last admin', 'last_site_admin')).toBe('last-site-admin');
			expect(helpers.resolveDeleteAccountToastKind('Sessie verlopen')).toBe('session-expired');
			expect(helpers.resolveDeleteAccountToastKind('other')).toBe('generic-error');
		});
	});

	describe('runSaveProfile', () => {
		it('sets validation errors and skips persist when phone is invalid', async () => {
			let errors: Record<string, string> = {};
			let saving = false;
			let profileChanged = false;

			await helpers.runSaveProfile({
				userId: 'user-1',
				formData: { first_name: 'Anna', last_name: 'Bakker', phone_number: '123' },
				profile: { first_name: 'Anna', last_name: null, phone_number: null, avatar_url: null },
				setErrors: (value) => {
					errors = typeof value === 'function' ? value(errors) : value;
				},
				setSaving: (value) => {
					saving = typeof value === 'function' ? value(saving) : value;
				},
				setProfile: () => {
					profileChanged = true;
				},
			});

			expect(errors).toEqual({ phone_number: 'Telefoonnummer moet precies 10 cijfers zijn' });
			expect(saving).toBe(false);
			expect(profileChanged).toBe(false);
			expect(persistProfileSpy).toHaveBeenCalledTimes(0);
			expect(toastCalls).toHaveLength(0);
		});

		it('persists profile, updates state, and shows success toast', async () => {
			let profile: AccountProfileState = {
				first_name: 'Old',
				last_name: 'Name',
				phone_number: null,
				avatar_url: null,
			};
			let saving = false;

			await helpers.runSaveProfile({
				userId: 'user-1',
				formData: { first_name: '', last_name: 'Bakker', phone_number: '' },
				profile,
				setErrors: () => {},
				setSaving: (value) => {
					saving = typeof value === 'function' ? value(saving) : value;
				},
				setProfile: (value) => {
					const nextProfile = typeof value === 'function' ? value(profile) : value;
					if (nextProfile !== null) {
						profile = nextProfile;
					}
				},
			});

			expect(profile).toEqual({
				first_name: null,
				last_name: 'Bakker',
				phone_number: null,
				avatar_url: null,
			});
			expect(saving).toBe(false);
			expect(dispatchProfileUpdatedSpy).toHaveBeenCalledTimes(1);
			expect(toastCalls).toEqual([{ kind: 'success', message: 'Profiel opgeslagen!' }]);
		});

		it('shows error toast when persist fails', async () => {
			persistProfileSpy.mockResolvedValue({ error: 'save failed' });

			await helpers.runSaveProfile({
				userId: 'user-1',
				formData: { first_name: 'Anna', last_name: 'Bakker', phone_number: '0612345678' },
				profile: { first_name: 'Anna', last_name: null, phone_number: null, avatar_url: null },
				setErrors: () => {},
				setSaving: () => {},
				setProfile: () => {},
			});

			expect(toastCalls).toEqual([{ kind: 'error', message: 'Fout bij opslaan', description: 'save failed' }]);
		});
	});

	describe('runUploadAvatar', () => {
		function createFileChangeEvent(files: FileList | null): ChangeEvent<HTMLInputElement> {
			return { target: { files } } as ChangeEvent<HTMLInputElement>;
		}

		it('returns early when no files are selected', async () => {
			let saving = false;
			let profileChanged = false;

			await helpers.runUploadAvatar({
				userId: 'user-1',
				event: createFileChangeEvent(null),
				profile: { first_name: 'Ada', last_name: null, phone_number: null, avatar_url: null },
				setSaving: (value) => {
					saving = typeof value === 'function' ? value(saving) : value;
				},
				setProfile: () => {
					profileChanged = true;
				},
			});

			expect(saving).toBe(false);
			expect(profileChanged).toBe(false);
			expect(persistAvatarUploadSpy).toHaveBeenCalledTimes(0);
			expect(toastCalls).toHaveLength(0);
		});

		it('shows error toast for failed uploads', async () => {
			persistAvatarUploadSpy.mockResolvedValue({ error: 'upload failed', avatarUrl: null });

			await helpers.runUploadAvatar({
				userId: 'user-1',
				event: createFileChangeEvent(createFileList(new File(['x'], 'avatar.png'))),
				profile: { first_name: 'Ada', last_name: null, phone_number: null, avatar_url: null },
				setSaving: () => {},
				setProfile: () => {},
			});

			expect(toastCalls).toEqual([
				{ kind: 'error', message: 'Fout bij uploaden avatar', description: 'upload failed' },
			]);
		});

		it('updates profile and shows success toast on success', async () => {
			persistAvatarUploadSpy.mockResolvedValue({
				error: null,
				avatarUrl: 'https://example.com/avatar.png',
			});
			const avatarState = { url: null as string | null };
			const profile: AccountProfileState = {
				first_name: 'Ada',
				last_name: null,
				phone_number: null,
				avatar_url: null,
			};

			await helpers.runUploadAvatar({
				userId: 'user-1',
				event: createFileChangeEvent(createFileList(new File(['x'], 'avatar.png'))),
				profile,
				setSaving: () => {},
				setProfile: (value) => {
					const nextProfile = typeof value === 'function' ? value(profile) : value;
					avatarState.url = nextProfile?.avatar_url ?? null;
				},
			});

			expect(avatarState.url).toBe('https://example.com/avatar.png');
			expect(dispatchProfileUpdatedSpy).toHaveBeenCalledTimes(1);
			expect(toastCalls).toEqual([{ kind: 'success', message: 'Avatar opgeslagen!' }]);
		});
	});
});
