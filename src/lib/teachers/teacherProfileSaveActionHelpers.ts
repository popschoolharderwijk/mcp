import type { SupabaseClient } from '@supabase/supabase-js';
import { saveTeacherProfileUpdates, type TeacherProfileSaveError } from '@/lib/teachers/teacherProfileSaveHelpers';
import {
	canSaveTeacherProfile,
	isTeacherProfileCocValid,
	type TeacherProfileFormValues,
} from '@/lib/teachers/teacherProfileSectionHelpers';

export function resolveTeacherProfileSaveErrorLabel(error: TeacherProfileSaveError): string {
	return error === 'bio' ? 'bio' : 'profiel';
}

export type TeacherProfileSaveValidation = 'coc_issued_on' | 'coc_issued_on_draft';

export type TeacherProfileSaveActionResult =
	| { saved: false }
	| { saved: true }
	| { saved: false; error: TeacherProfileSaveError; message: string }
	| { saved: false; validation: TeacherProfileSaveValidation };

/** Map save result to UI feedback. Caller shows toasts / triggers refresh. */
export type TeacherProfileSaveFeedback =
	| { kind: 'noop' }
	| { kind: 'success' }
	| { kind: 'validation'; message: string }
	| { kind: 'error'; label: string; message: string };

export function teacherProfileSaveFeedback(result: TeacherProfileSaveActionResult): TeacherProfileSaveFeedback {
	if (result.saved) return { kind: 'success' };
	if ('validation' in result && result.validation === 'coc_issued_on') {
		return { kind: 'validation', message: 'VOG-afgiftedatum is verplicht' };
	}
	if ('validation' in result && result.validation === 'coc_issued_on_draft') {
		return { kind: 'validation', message: 'VOG-afgiftedatum is ongeldig' };
	}
	if ('error' in result) {
		return {
			kind: 'error',
			label: resolveTeacherProfileSaveErrorLabel(result.error),
			message: result.message,
		};
	}
	return { kind: 'noop' };
}

export type TeacherProfileSaveFeedbackHandlers = {
	onValidation: (message: string) => void;
	onError: (label: string, message: string) => void;
	onSuccess: () => void;
};

/** Dispatch save feedback to UI handlers. */
export function applyTeacherProfileSaveFeedback(
	feedback: TeacherProfileSaveFeedback,
	handlers: TeacherProfileSaveFeedbackHandlers,
): void {
	if (feedback.kind === 'validation') {
		handlers.onValidation(feedback.message);
		return;
	}
	if (feedback.kind === 'error') {
		handlers.onError(feedback.label, feedback.message);
		return;
	}
	if (feedback.kind === 'success') {
		handlers.onSuccess();
	}
}

export async function runTeacherProfileSave(params: {
	supabase: SupabaseClient;
	teacherUserId: string;
	userId: string;
	canEdit: boolean;
	hasUser: boolean;
	form: TeacherProfileFormValues;
	cocIssuedOnDraftSynced?: boolean;
}): Promise<TeacherProfileSaveActionResult> {
	if (!canSaveTeacherProfile(params.teacherUserId, params.userId, params.canEdit, params.hasUser)) {
		return { saved: false };
	}
	if (!isTeacherProfileCocValid(params.form)) {
		return { saved: false, validation: 'coc_issued_on' };
	}
	if (params.form.hasCoc && params.cocIssuedOnDraftSynced === false) {
		return { saved: false, validation: 'coc_issued_on_draft' };
	}

	const result = await saveTeacherProfileUpdates(params.supabase, params.teacherUserId, params.userId, params.form);
	if (result.ok === false) {
		return { saved: false, error: result.error, message: result.message };
	}

	return { saved: true };
}
