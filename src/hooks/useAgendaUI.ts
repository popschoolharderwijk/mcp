import { useEffect, useRef, useState } from 'react';
import type { View } from 'react-big-calendar';
import { useSearchParams } from 'react-router-dom';
import type { RecurrenceScope } from '@/components/agenda/RecurrenceChoiceDialog';
import type { CalendarEvent } from '@/components/agenda/types';
import { buildAgendaUrlSearchParams, parseAgendaUrlState } from '@/lib/agenda/agendaUrlState';
import type { OptimisticMove } from '@/lib/agenda/buildCalendarEvents';
import { formatDateToDb, now } from '@/lib/date/date-format';
import type { AgendaEventRow } from '@/types/agenda-events';
import type { User } from '@/types/users';

function useAgendaUrlSyncedState() {
	const [searchParams, setSearchParams] = useSearchParams();
	const initialUrlState = useRef(parseAgendaUrlState(searchParams, now())).current;

	const [currentView, setCurrentView] = useState<View>(initialUrlState.view);
	const [currentDate, setCurrentDate] = useState(initialUrlState.date);
	const [isFullscreen, setIsFullscreen] = useState(initialUrlState.fullscreen);

	// Keep URL in sync; omit default view/date/fullscreen.
	useEffect(() => {
		const today = now();
		const state = { view: currentView, date: currentDate, fullscreen: isFullscreen };
		setSearchParams(
			(prev) => {
				const next = buildAgendaUrlSearchParams(prev, state, today);
				return next.toString() === prev.toString() ? prev : next;
			},
			{ replace: true },
		);
	}, [currentView, currentDate, isFullscreen, setSearchParams]);

	// Apply browser back/forward into local state (searchParams-only deps — do not fight local edits).
	useEffect(() => {
		const parsed = parseAgendaUrlState(searchParams, now());
		setCurrentView((view) => (view === parsed.view ? view : parsed.view));
		setCurrentDate((date) => (formatDateToDb(date) === formatDateToDb(parsed.date) ? date : parsed.date));
		setIsFullscreen((fullscreen) => (fullscreen === parsed.fullscreen ? fullscreen : parsed.fullscreen));
	}, [searchParams]);

	return {
		currentView,
		setCurrentView,
		currentDate,
		setCurrentDate,
		isFullscreen,
		setIsFullscreen,
	};
}

function useAgendaFormDialogUiState() {
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<AgendaEventRow | null>(null);
	const [newEventSlot, setNewEventSlot] = useState<{ start: Date; end: Date } | null>(null);
	const openingForEditRef = useRef(false);

	return {
		selectedEvent,
		setSelectedEvent,
		formDialogOpen,
		setFormDialogOpen,
		editingEvent,
		setEditingEvent,
		newEventSlot,
		setNewEventSlot,
		openingForEditRef,
	};
}

function useAgendaCancelRecurrenceUiState() {
	const [isCancelling, setIsCancelling] = useState(false);
	const [cancelLessonConfirmOpen, setCancelLessonConfirmOpen] = useState(false);
	const [recurrenceChoiceOpen, setRecurrenceChoiceOpen] = useState(false);
	const [recurrenceChoiceAction, setRecurrenceChoiceAction] = useState<'change' | 'cancel'>('change');
	const [pendingCancelScope, setPendingCancelScope] = useState<RecurrenceScope>('single');

	return {
		isCancelling,
		setIsCancelling,
		cancelLessonConfirmOpen,
		setCancelLessonConfirmOpen,
		recurrenceChoiceOpen,
		setRecurrenceChoiceOpen,
		recurrenceChoiceAction,
		setRecurrenceChoiceAction,
		pendingCancelScope,
		setPendingCancelScope,
	};
}

function useAgendaMoveModalUiState() {
	const [pendingDrop, setPendingDrop] = useState<{ event: CalendarEvent; start: Date; end: Date } | null>(null);
	const [optimisticMove, setOptimisticMove] = useState<OptimisticMove | null>(null);
	const [studentInfoModal, setStudentInfoModal] = useState<{
		open: boolean;
		student: User | null;
	}>({ open: false, student: null });

	return {
		pendingDrop,
		setPendingDrop,
		optimisticMove,
		setOptimisticMove,
		studentInfoModal,
		setStudentInfoModal,
	};
}

export function useAgendaUI() {
	return {
		...useAgendaUrlSyncedState(),
		...useAgendaFormDialogUiState(),
		...useAgendaCancelRecurrenceUiState(),
		...useAgendaMoveModalUiState(),
	};
}
