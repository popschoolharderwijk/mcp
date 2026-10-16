import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { CalendarEvent } from '../../../src/components/agenda/types';

const toastMessages: { type: 'error' | 'success'; message: string }[] = [];
const deleteCalls: { eventId: string; scope: string; occurrenceDate?: string; userId: string }[] = [];
const revertCalls: {
	members?: unknown;
	fallback?: { eventId: string; originalDate: string };
}[] = [];
const notifyCalls: { throwOnError?: boolean }[] = [];
let updateError: { message: string } | null = null;
let rpcError: { message: string } | null = null;

const supabaseMock = {
	from: (table: string) => ({
		update: () => ({
			eq: () =>
				Promise.resolve({
					error: table === 'agenda_event_deviations' ? updateError : null,
				}),
		}),
	}),
	rpc: () => Promise.resolve({ error: rpcError }),
};

function mockCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
	return {
		title: 'Les',
		start: new Date('2026-09-07T14:00:00'),
		end: new Date('2026-09-07T15:00:00'),
		resource: {
			type: 'agenda',
			agreementId: 'agr-1',
			eventId: 'event-1',
			studentName: 'Jan Jansen',
			lessonTypeName: 'Piano',
			lessonTypeColor: null,
			lessonTypeIcon: null,
			isDeviation: false,
			isCancelled: false,
			isGroupLesson: false,
			isRecurring: true,
			sourceType: 'lesson_agreement',
		},
		...overrides,
	};
}

type UiState = {
	selectedEvent: CalendarEvent | null;
	editingEvent: { source_type: string; source_id: string | null } | null;
	formDialogOpen: boolean;
	cancelLessonConfirmOpen: boolean;
	recurrenceChoiceOpen: boolean;
	recurrenceChoiceAction: 'change' | 'cancel';
	setFormDialogOpen: (open: boolean) => void;
	setEditingEvent: (event: UiState['editingEvent']) => void;
	setNewEventSlot: () => void;
	setSelectedEvent: (event: CalendarEvent | null) => void;
	setCancelLessonConfirmOpen: (open: boolean) => void;
	setRecurrenceChoiceOpen: (open: boolean) => void;
	setRecurrenceChoiceAction: (action: 'change' | 'cancel') => void;
};

function createUiState(): UiState {
	const state: UiState = {
		selectedEvent: null,
		editingEvent: null,
		formDialogOpen: false,
		cancelLessonConfirmOpen: false,
		recurrenceChoiceOpen: false,
		recurrenceChoiceAction: 'change',
		setFormDialogOpen: (open: boolean) => {
			state.formDialogOpen = open;
		},
		setEditingEvent: (event) => {
			state.editingEvent = event;
		},
		setNewEventSlot: () => {},
		setSelectedEvent: (event: CalendarEvent | null) => {
			state.selectedEvent = event;
		},
		setCancelLessonConfirmOpen: (open: boolean) => {
			state.cancelLessonConfirmOpen = open;
		},
		setRecurrenceChoiceOpen: (open: boolean) => {
			state.recurrenceChoiceOpen = open;
		},
		setRecurrenceChoiceAction: (action: 'change' | 'cancel') => {
			state.recurrenceChoiceAction = action;
		},
	};
	return state;
}

describe('agendaFormDialogActions', () => {
	let actions: typeof import('../../../src/components/agenda/agendaFormDialogActions');
	let deleteAgendaEventModule: typeof import('../../../src/lib/agenda/deleteAgendaEvent');
	let notifyAgendaOpResultModule: typeof import('../../../src/lib/agenda/notifyAgendaOpResult');
	let revertMergedSlotLessonsModule: typeof import('../../../src/lib/agenda/revertMergedSlotLessons');
	let deleteAgendaEventSpy: ReturnType<typeof spyOn>;
	let notifyAgendaOpResultSpy: ReturnType<typeof spyOn>;
	let revertMergedSlotLessonsSpy: ReturnType<typeof spyOn>;

	beforeAll(async () => {
		mock.module('sonner', () => ({
			toast: {
				error: (message: string) => {
					toastMessages.push({ type: 'error', message });
				},
				success: (message: string) => {
					toastMessages.push({ type: 'success', message });
				},
			},
		}));
		mock.module('../../../src/integrations/supabase/client', () => ({
			supabase: supabaseMock,
		}));
		deleteAgendaEventModule = await import('../../../src/lib/agenda/deleteAgendaEvent');
		notifyAgendaOpResultModule = await import('../../../src/lib/agenda/notifyAgendaOpResult');
		revertMergedSlotLessonsModule = await import('../../../src/lib/agenda/revertMergedSlotLessons');
		actions = await import('../../../src/components/agenda/agendaFormDialogActions');
	});

	afterAll(() => {
		mock.restore();
	});

	beforeEach(() => {
		deleteAgendaEventSpy = spyOn(deleteAgendaEventModule, 'deleteAgendaEvent').mockImplementation(
			async (params: { eventId: string; scope: string; occurrenceDate?: string; userId: string }) => {
				deleteCalls.push(params);
				return { ok: true, message: '' };
			},
		);
		notifyAgendaOpResultSpy = spyOn(notifyAgendaOpResultModule, 'notifyAgendaOpResult').mockImplementation(
			async (
				result: { ok: boolean; message: string },
				onSuccess?: () => void | Promise<void>,
				options?: { throwOnError?: boolean },
			) => {
				notifyCalls.push(options ?? {});
				await onSuccess?.();
				return result.ok;
			},
		);
		revertMergedSlotLessonsSpy = spyOn(revertMergedSlotLessonsModule, 'revertMergedSlotLessons').mockImplementation(
			async (members: unknown, fallback?: { eventId: string; originalDate: string }) => {
				revertCalls.push({ members, fallback });
				return { ok: true, message: '' };
			},
		);
		toastMessages.length = 0;
		deleteCalls.length = 0;
		revertCalls.length = 0;
		notifyCalls.length = 0;
		updateError = null;
		rpcError = null;
	});

	afterEach(() => {
		deleteAgendaEventSpy.mockRestore();
		notifyAgendaOpResultSpy.mockRestore();
		revertMergedSlotLessonsSpy.mockRestore();
	});

	it('returns undefined delete handler without manage permissions', () => {
		const ui = createUiState();
		const handler = actions.buildAgendaDeleteHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: false,
			user: { id: 'user-1' } as never,
			reloadAgenda: () => {},
			handleCancelLesson: async () => {},
		});
		expect(handler).toBeUndefined();
	});

	it('deletes an agenda event when manage permissions are present', async () => {
		const ui = createUiState();
		let reloaded = false;
		const handler = actions.buildAgendaDeleteHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: true,
			user: { id: 'user-1' } as never,
			reloadAgenda: () => {
				reloaded = true;
			},
			handleCancelLesson: async () => {},
		});
		expect(handler).toBeDefined();
		await handler?.('event-1', 'single', '2026-09-07');
		expect(deleteCalls).toEqual([
			{ eventId: 'event-1', scope: 'single', occurrenceDate: '2026-09-07', userId: 'user-1' },
		]);
		expect(notifyCalls).toEqual([{ throwOnError: true }]);
		expect(reloaded).toBe(true);
	});

	it('returns undefined revert handler when the selected event is not a deviation', () => {
		const ui = createUiState();
		ui.selectedEvent = mockCalendarEvent();
		const handler = actions.buildAgendaRevertHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: true,
			user: { id: 'user-1' } as never,
			reloadAgenda: () => {},
			handleCancelLesson: async () => {},
		});
		expect(handler).toBeUndefined();
	});

	it('reverts a deviation when the selected event is cancelled', async () => {
		const ui = createUiState();
		ui.selectedEvent = mockCalendarEvent({
			resource: {
				...mockCalendarEvent().resource,
				isDeviation: true,
				isCancelled: true,
				deviationId: 'dev-1',
				originalDate: '2026-09-07',
				originalStartTime: '09:00:00',
			},
		});
		let reloaded = false;
		const handler = actions.buildAgendaRevertHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: true,
			user: { id: 'user-1' } as never,
			reloadAgenda: () => {
				reloaded = true;
			},
			handleCancelLesson: async () => {},
		});
		expect(handler).toBeDefined();
		await handler?.();
		expect(revertCalls).toEqual([
			{
				members: undefined,
				fallback: { eventId: 'event-1', originalDate: '2026-09-07' },
			},
		]);
		expect(reloaded).toBe(true);
	});

	it('reverts all deviant members of a same-slot merge', async () => {
		const ui = createUiState();
		const mergedMembers = [
			{ eventId: 'event-anna', isDeviation: false, originalDate: '2026-09-07' },
			{
				eventId: 'event-bob',
				isDeviation: true,
				hasTimeOrDateChange: true,
				deviationId: 'dev-bob',
				originalDate: '2026-09-07',
			},
		];
		ui.selectedEvent = mockCalendarEvent({
			resource: {
				...mockCalendarEvent().resource,
				isDeviation: true,
				hasTimeOrDateChange: true,
				deviationId: 'dev-bob',
				originalDate: '2026-09-07',
				originalStartTime: '09:00:00',
				isSameSlotMerge: true,
				mergedSlotMembers: mergedMembers,
			},
		});
		const handler = actions.buildAgendaRevertHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: true,
			user: { id: 'user-1' } as never,
			reloadAgenda: () => {},
			handleCancelLesson: async () => {},
		});
		expect(handler).toBeDefined();
		await handler?.();
		expect(revertCalls).toEqual([
			{
				members: mergedMembers,
				fallback: { eventId: 'event-1', originalDate: '2026-09-07' },
			},
		]);
	});

	it('opens recurrence choice for recurring cancel actions', () => {
		const ui = createUiState();
		ui.selectedEvent = mockCalendarEvent({ resource: { ...mockCalendarEvent().resource, isRecurring: true } });
		const handler = actions.buildOpenCancelConfirmHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: false,
			user: { id: 'user-1' } as never,
			reloadAgenda: () => {},
			handleCancelLesson: async () => {},
		});
		handler?.();
		expect(ui.recurrenceChoiceOpen).toBe(true);
		expect(ui.recurrenceChoiceAction).toBe('cancel');
		expect(ui.cancelLessonConfirmOpen).toBe(false);
	});

	it('opens direct cancel confirm for non-recurring events', () => {
		const ui = createUiState();
		ui.selectedEvent = mockCalendarEvent({
			resource: {
				...mockCalendarEvent().resource,
				isRecurring: false,
				sourceType: 'manual',
			},
		});
		const handler = actions.buildOpenCancelConfirmHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: false,
			user: { id: 'user-1' } as never,
			reloadAgenda: () => {},
			handleCancelLesson: async () => {},
		});
		handler?.();
		expect(ui.cancelLessonConfirmOpen).toBe(true);
		expect(ui.recurrenceChoiceOpen).toBe(false);
	});

	it('marks a rescheduled deviation as completed', async () => {
		const ui = createUiState();
		ui.selectedEvent = mockCalendarEvent({
			resource: {
				...mockCalendarEvent().resource,
				needsReschedule: true,
				deviationId: 'dev-1',
			},
		});
		let reloaded = false;
		const handler = actions.buildMarkRescheduledHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: false,
			user: { id: 'user-1' } as never,
			reloadAgenda: async () => {
				reloaded = true;
			},
			handleCancelLesson: async () => {},
		});
		await handler?.();
		expect(toastMessages).toEqual([{ type: 'success', message: 'Les gemarkeerd als ingehaald' }]);
		expect(reloaded).toBe(true);
	});

	it('shows an error toast when marking rescheduled fails', async () => {
		updateError = { message: 'db error' };
		const ui = createUiState();
		ui.selectedEvent = mockCalendarEvent({
			resource: {
				...mockCalendarEvent().resource,
				needsReschedule: true,
				deviationId: 'dev-1',
			},
		});
		const handler = actions.buildMarkRescheduledHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: false,
			user: { id: 'user-1' } as never,
			reloadAgenda: async () => {},
			handleCancelLesson: async () => {},
		});
		await handler?.();
		expect(toastMessages).toEqual([{ type: 'error', message: 'Fout bij markeren als ingehaald' }]);
	});

	it('marks a trial lesson as completed and closes the dialog', async () => {
		const ui = createUiState();
		ui.formDialogOpen = true;
		ui.editingEvent = { source_type: 'trial_lesson', source_id: 'trial-1' };
		let reloaded = false;
		const handler = actions.buildMarkTrialCompletedHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: false,
			user: { id: 'user-1' } as never,
			reloadAgenda: async () => {
				reloaded = true;
			},
			handleCancelLesson: async () => {},
		});
		await handler?.();
		expect(toastMessages).toEqual([{ type: 'success', message: 'Proefles gemarkeerd als gegeven' }]);
		expect(ui.formDialogOpen).toBe(false);
		expect(reloaded).toBe(true);
	});

	it('shows a specific error when trial completion has an invalid status transition', async () => {
		rpcError = { message: 'invalid_status_transition' };
		const ui = createUiState();
		ui.editingEvent = { source_type: 'trial_lesson', source_id: 'trial-1' };
		const handler = actions.buildMarkTrialCompletedHandler({
			ui: ui as never,
			canEdit: true,
			canManageAgenda: false,
			user: { id: 'user-1' } as never,
			reloadAgenda: async () => {},
			handleCancelLesson: async () => {},
		});
		await handler?.();
		expect(toastMessages).toEqual([
			{ type: 'error', message: 'Deze proefles kan niet meer als gegeven worden gemarkeerd' },
		]);
	});

	it('clears editing state when the form dialog closes', () => {
		const ui = createUiState();
		ui.formDialogOpen = true;
		ui.editingEvent = { source_type: 'manual', source_id: null };
		ui.selectedEvent = mockCalendarEvent();
		const handler = actions.buildFormDialogOpenChangeHandler(ui as never);
		handler(false);
		expect(ui.formDialogOpen).toBe(false);
		expect(ui.editingEvent).toBeNull();
		expect(ui.selectedEvent).toBeNull();
	});
});
