import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { ChangeEvent } from 'react';
import * as persistence from '../../../src/lib/account/persistence';

const toastCalls: { kind: 'error' | 'success'; message: string }[] = [];

mock.module('sonner', () => ({
	toast: {
		error: (message: string) => {
			toastCalls.push({ kind: 'error', message });
		},
		success: (message: string) => {
			toastCalls.push({ kind: 'success', message });
		},
	},
}));

describe('profileAvatarActions', () => {
	let actions: typeof import('../../../src/lib/account/profileAvatarActions');
	let persistAvatarUploadSpy: ReturnType<typeof spyOn>;
	let persistAvatarDeleteSpy: ReturnType<typeof spyOn>;
	let dispatchProfileUpdatedSpy: ReturnType<typeof spyOn>;

	beforeAll(async () => {
		actions = await import('../../../src/lib/account/profileAvatarActions');
	});

	beforeEach(() => {
		toastCalls.length = 0;
		persistAvatarUploadSpy = spyOn(persistence, 'persistAvatarUpload').mockResolvedValue({
			error: null,
			avatarUrl: 'https://example.com/a.png',
		});
		persistAvatarDeleteSpy = spyOn(persistence, 'persistAvatarDelete').mockResolvedValue({ error: null });
		dispatchProfileUpdatedSpy = spyOn(persistence, 'dispatchProfileUpdated').mockImplementation(() => {});
	});

	afterEach(() => {
		persistAvatarUploadSpy.mockRestore();
		persistAvatarDeleteSpy.mockRestore();
		dispatchProfileUpdatedSpy.mockRestore();
	});

	it('clears the file input and returns the selected file', () => {
		const file = new File(['x'], 'avatar.png', { type: 'image/png' });
		const event = {
			target: {
				files: { 0: file, length: 1, item: () => file },
				value: 'C:\\fakepath\\avatar.png',
			},
		} as unknown as ChangeEvent<HTMLInputElement>;

		expect(actions.takeAvatarFileFromInput(event)).toBe(file);
		expect(event.target.value).toBe('');
	});

	it('returns ok false and toasts when upload fails', async () => {
		persistAvatarUploadSpy.mockResolvedValue({ error: 'upload failed', avatarUrl: null });
		const result = await actions.uploadProfileAvatar('user-1', new File(['x'], 'a.png'));
		expect(result).toEqual({ ok: false });
		expect(toastCalls).toEqual([{ kind: 'error', message: 'Fout bij uploaden avatar' }]);
		expect(dispatchProfileUpdatedSpy).toHaveBeenCalledTimes(0);
	});

	it('returns the avatar url and notifies listeners on upload success', async () => {
		const result = await actions.uploadProfileAvatar('user-1', new File(['x'], 'a.png'));
		expect(result).toEqual({ ok: true, avatarUrl: 'https://example.com/a.png' });
		expect(toastCalls).toEqual([{ kind: 'success', message: 'Avatar opgeslagen!' }]);
		expect(dispatchProfileUpdatedSpy).toHaveBeenCalledTimes(1);
	});

	it('returns false and toasts when delete fails', async () => {
		persistAvatarDeleteSpy.mockResolvedValue({ error: 'delete failed' });
		expect(await actions.deleteProfileAvatar('user-1')).toBe(false);
		expect(toastCalls).toEqual([{ kind: 'error', message: 'Fout bij verwijderen avatar' }]);
	});

	it('returns true and notifies listeners on delete success', async () => {
		expect(await actions.deleteProfileAvatar('user-1')).toBe(true);
		expect(toastCalls).toEqual([{ kind: 'success', message: 'Avatar verwijderd!' }]);
		expect(dispatchProfileUpdatedSpy).toHaveBeenCalledTimes(1);
	});
});
