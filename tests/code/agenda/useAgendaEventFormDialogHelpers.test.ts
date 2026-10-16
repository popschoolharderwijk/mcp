import { describe, expect, it } from 'bun:test';
import {
	buildAgendaEventFormActionsParams,
	buildAgendaEventFormParams,
	buildAgendaEventSourceSelectionParams,
	resolveAgendaEventFormDialogDefaults,
} from '../../../src/components/agenda/useAgendaEventFormDialogHelpers';

describe('resolveAgendaEventFormDialogDefaults', () => {
	it('applies default dialog flags', () => {
		expect(
			resolveAgendaEventFormDialogDefaults({
				open: true,
				onOpenChange: () => undefined,
			}),
		).toEqual({
			readonlyParticipantIds: [],
			canAddParticipants: true,
			isCancelling: false,
			isMarkingTrialCompleted: false,
		});
	});

	it('preserves explicit dialog flags', () => {
		expect(
			resolveAgendaEventFormDialogDefaults({
				open: true,
				onOpenChange: () => undefined,
				readonlyParticipantIds: ['a'],
				canAddParticipants: false,
				isCancelling: true,
				isMarkingTrialCompleted: true,
			}),
		).toEqual({
			readonlyParticipantIds: ['a'],
			canAddParticipants: false,
			isCancelling: true,
			isMarkingTrialCompleted: true,
		});
	});
});

describe('buildAgendaEventSourceSelectionParams', () => {
	it('maps dialog props to source selection params', () => {
		expect(
			buildAgendaEventSourceSelectionParams(
				{
					open: true,
					onOpenChange: () => undefined,
					initialProjectId: 'project-1',
				},
				true,
			),
		).toEqual({
			open: true,
			event: undefined,
			initialProjectId: 'project-1',
			isPrivileged: true,
		});
	});
});

describe('buildAgendaEventFormParams', () => {
	it('maps dialog props to agenda form params', () => {
		const defaults = resolveAgendaEventFormDialogDefaults({
			open: true,
			onOpenChange: () => undefined,
			readonlyParticipantIds: ['participant-1'],
		});
		expect(
			buildAgendaEventFormParams(
				{
					open: true,
					onOpenChange: () => undefined,
					onSuccess: () => undefined,
				},
				defaults,
				'user-1',
				{
					effectiveSourceType: 'project',
					effectiveSourceId: 'project-1',
				} as never,
			),
		).toEqual({
			open: true,
			event: undefined,
			initialSlot: undefined,
			userId: 'user-1',
			occurrenceDate: undefined,
			occurrenceStartTime: undefined,
			occurrenceEndTime: undefined,
			occurrenceParticipantIds: undefined,
			occurrenceParticipantProfiles: undefined,
			occurrenceOverrides: undefined,
			readonlyParticipantIds: ['participant-1'],
			sourceType: 'project',
			sourceId: 'project-1',
			onSuccess: expect.any(Function),
			onOpenChange: expect.any(Function),
		});
	});
});

describe('buildAgendaEventFormActionsParams', () => {
	it('maps dialog props to action params', () => {
		const performSave = async () => undefined;
		expect(
			buildAgendaEventFormActionsParams(
				{
					open: true,
					onOpenChange: () => undefined,
					event: { id: 'event-1' } as never,
				},
				'user-1',
				{ startDate: '2026-09-07', startTime: '14:00' } as never,
				{ canDelete: true } as never,
				{ selectedProjectId: 'project-1', isProjectEvent: true } as never,
				{ performSave } as never,
			),
		).toEqual({
			userId: 'user-1',
			eventId: 'event-1',
			selectedProjectId: 'project-1',
			isProjectEvent: true,
			occurrenceDate: undefined,
			startDate: '2026-09-07',
			startTime: '14:00',
			permissions: { canDelete: true } as never,
			onDelete: undefined,
			onRevert: undefined,
			onOpenChange: expect.any(Function),
			onSuccess: undefined,
			performSave,
		});
	});
});
