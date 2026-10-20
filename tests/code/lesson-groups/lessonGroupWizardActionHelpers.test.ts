import { beforeAll, describe, expect, it, mock } from 'bun:test';
import { handleLessonGroupSlotClickState } from '../../../src/components/lesson-groups/wizard/lessonGroupWizardActionHelpers';

const toastCalls: { kind: 'error' | 'success'; message: string; description?: string }[] = [];
let saveShouldReject = false;
let saved = false;
let navigatedTo = '';

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

mock.module('../../../src/components/lesson-groups/wizard/lessonGroupSave', () => ({
	saveLessonGroup: async () => {
		if (saveShouldReject) {
			throw new Error('save failed');
		}
		saved = true;
	},
}));

const completeForm = {
	name: 'Groep A',
	lessonTypeId: 'lt-1',
	teacherUserId: 'teacher-1',
	slot: {
		day_of_week: 1,
		start_time: '14:00:00',
		end_time: '18:00:00',
		status: 'free' as const,
		totalOccurrences: 10,
		occupiedOccurrences: 0,
	},
	durationMinutes: 45,
	frequency: 'weekly' as const,
	startDate: '2026-09-01',
	endDate: '',
	memberIds: [],
	selectedRequestIds: [],
	scheduleInAgenda: true,
};

describe('handleLessonGroupSlotClickState', () => {
	it('maps slot statuses to click actions', () => {
		expect(handleLessonGroupSlotClickState('occupied')).toBe('ignore');
		expect(handleLessonGroupSlotClickState('partial')).toBe('open-partial');
		expect(handleLessonGroupSlotClickState('free')).toBe('select');
	});
});

describe('executeLessonGroupWizardSave', () => {
	let executeLessonGroupWizardSave: typeof import('../../../src/components/lesson-groups/wizard/lessonGroupWizardActionHelpers').executeLessonGroupWizardSave;

	beforeAll(async () => {
		({ executeLessonGroupWizardSave } = await import(
			'../../../src/components/lesson-groups/wizard/lessonGroupWizardActionHelpers'
		));
	});

	it('shows validation toast for incomplete forms', async () => {
		toastCalls.length = 0;
		let saving = false;
		await executeLessonGroupWizardSave({
			form: { ...completeForm, slot: null },
			isEditMode: false,
			groupId: undefined,
			navigate: () => {},
			setSaving: (value) => {
				saving = value;
			},
		});
		expect(toastCalls[0]?.message).toBe('Vul alle verplichte velden in');
		expect(saving).toBe(false);
	});

	it('saves complete forms and navigates to overview', async () => {
		toastCalls.length = 0;
		saved = false;
		navigatedTo = '';
		let saving = true;
		await executeLessonGroupWizardSave({
			form: completeForm,
			isEditMode: false,
			groupId: undefined,
			navigate: (path) => {
				navigatedTo = String(path);
			},
			setSaving: (value) => {
				saving = value;
			},
		});
		expect(saved).toBe(true);
		expect(navigatedTo).toBe('/lesson-groups');
		expect(toastCalls[0]?.message).toBe('Lesgroep aangemaakt');
		expect(saving).toBe(false);
	});

	it('shows error toast when save fails', async () => {
		toastCalls.length = 0;
		saveShouldReject = true;
		await executeLessonGroupWizardSave({
			form: completeForm,
			isEditMode: true,
			groupId: 'group-1',
			navigate: () => {},
			setSaving: () => {},
		});
		saveShouldReject = false;
		expect(toastCalls[0]?.message).toBe('Opslaan mislukt');
	});
});
