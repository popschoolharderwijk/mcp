import { describe, expect, it } from 'bun:test';
import {
	applyTeacherProfileSaveFeedback,
	resolveTeacherProfileSaveErrorLabel,
	runTeacherProfileSave,
	teacherProfileSaveFeedback,
} from '../../../src/lib/teachers/teacherProfileSaveActionHelpers';

const form = {
	bio: 'Bio',
	firstName: 'Jan',
	lastName: 'Jansen',
	email: 'jan@example.com',
	phoneNumber: '0612345678',
	hasCoc: true,
	cocIssuedOn: '2023-12-06',
};

describe('resolveTeacherProfileSaveErrorLabel', () => {
	it('returns bio label for bio errors', () => {
		expect(resolveTeacherProfileSaveErrorLabel('bio')).toBe('bio');
	});

	it('returns profiel label for profile errors', () => {
		expect(resolveTeacherProfileSaveErrorLabel('profile')).toBe('profiel');
	});
});

describe('teacherProfileSaveFeedback', () => {
	it('maps success to success feedback', () => {
		expect(teacherProfileSaveFeedback({ saved: true })).toEqual({ kind: 'success' });
	});

	it('maps silent failure to noop', () => {
		expect(teacherProfileSaveFeedback({ saved: false })).toEqual({ kind: 'noop' });
	});

	it('maps VOG validation to a Dutch validation message', () => {
		expect(teacherProfileSaveFeedback({ saved: false, validation: 'coc_issued_on' })).toEqual({
			kind: 'validation',
			message: 'VOG-afgiftedatum is verplicht',
		});
	});

	it('maps VOG draft sync validation to a Dutch validation message', () => {
		expect(teacherProfileSaveFeedback({ saved: false, validation: 'coc_issued_on_draft' })).toEqual({
			kind: 'validation',
			message: 'VOG-afgiftedatum is ongeldig',
		});
	});

	it('maps profile errors to labeled error feedback', () => {
		expect(teacherProfileSaveFeedback({ saved: false, error: 'profile', message: 'db down' })).toEqual({
			kind: 'error',
			label: 'profiel',
			message: 'db down',
		});
	});

	it('maps bio errors to bio label', () => {
		expect(teacherProfileSaveFeedback({ saved: false, error: 'bio', message: 'too long' })).toEqual({
			kind: 'error',
			label: 'bio',
			message: 'too long',
		});
	});
});

describe('applyTeacherProfileSaveFeedback', () => {
	it('calls onValidation for validation feedback', () => {
		const calls: string[] = [];
		applyTeacherProfileSaveFeedback(
			{ kind: 'validation', message: 'VOG-afgiftedatum is verplicht' },
			{
				onValidation: (message) => calls.push(`v:${message}`),
				onError: () => calls.push('e'),
				onSuccess: () => calls.push('s'),
			},
		);
		expect(calls).toEqual(['v:VOG-afgiftedatum is verplicht']);
	});

	it('calls onError for error feedback', () => {
		const calls: string[] = [];
		applyTeacherProfileSaveFeedback(
			{ kind: 'error', label: 'profiel', message: 'db down' },
			{
				onValidation: () => calls.push('v'),
				onError: (label, message) => calls.push(`e:${label}:${message}`),
				onSuccess: () => calls.push('s'),
			},
		);
		expect(calls).toEqual(['e:profiel:db down']);
	});

	it('calls onSuccess for success feedback', () => {
		const calls: string[] = [];
		applyTeacherProfileSaveFeedback(
			{ kind: 'success' },
			{
				onValidation: () => calls.push('v'),
				onError: () => calls.push('e'),
				onSuccess: () => calls.push('s'),
			},
		);
		expect(calls).toEqual(['s']);
	});

	it('calls no handlers for noop feedback', () => {
		const calls: string[] = [];
		applyTeacherProfileSaveFeedback(
			{ kind: 'noop' },
			{
				onValidation: () => calls.push('v'),
				onError: () => calls.push('e'),
				onSuccess: () => calls.push('s'),
			},
		);
		expect(calls).toEqual([]);
	});
});

describe('runTeacherProfileSave', () => {
	it('returns saved false when user cannot save', async () => {
		const result = await runTeacherProfileSave({
			supabase: {} as never,
			teacherUserId: 'teacher-1',
			userId: 'user-1',
			canEdit: false,
			hasUser: true,
			form,
		});
		expect(result).toEqual({ saved: false });
	});

	it('returns validation error when VOG is on without issue date', async () => {
		const result = await runTeacherProfileSave({
			supabase: {} as never,
			teacherUserId: 'teacher-1',
			userId: 'user-1',
			canEdit: true,
			hasUser: true,
			form: { ...form, cocIssuedOn: '' },
		});
		expect(result).toEqual({ saved: false, validation: 'coc_issued_on' });
	});

	it('returns validation error when VOG date draft is not synced', async () => {
		const result = await runTeacherProfileSave({
			supabase: {} as never,
			teacherUserId: 'teacher-1',
			userId: 'user-1',
			canEdit: true,
			hasUser: true,
			form,
			cocIssuedOnDraftSynced: false,
		});
		expect(result).toEqual({ saved: false, validation: 'coc_issued_on_draft' });
	});
});
