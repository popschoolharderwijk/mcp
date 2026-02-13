import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { LuLoaderCircle } from 'react-icons/lu';
import { toast } from 'sonner';
import { StudentInfoModal, type StudentInfoModalData } from '@/components/students/StudentInfoModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AVAILABILITY_SETTINGS, calendarLocalizer } from '@/lib/dateHelpers';
import type { LessonAgreementWithStudent, LessonAppointmentDeviationWithAgreement } from '@/types/lesson-agreements';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { ConfirmCancelDialog } from './agenda/ConfirmCancelDialog';
import { DetailModal } from './agenda/DetailModal';
import { AgendaEvent } from './agenda/Event';
import { Legend } from './agenda/Legend';
import type { CalendarEvent, TeacherAgendaViewProps } from './agenda/types';
import { buildTooltipText, dutchFormats, generateRecurringEvents, getDateForDayOfWeek } from './agenda/utils';

const DragAndDropCalendar = withDragAndDrop(Calendar);

export function TeacherAgendaView({ teacherId, canEdit }: TeacherAgendaViewProps) {
	const { user } = useAuth();
	const [agreements, setAgreements] = useState<LessonAgreementWithStudent[]>([]);
	const [deviations, setDeviations] = useState<LessonAppointmentDeviationWithAgreement[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentView, setCurrentView] = useState<View>('week');
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);
	const [isReverting, setIsReverting] = useState(false);
	const [cancelLessonConfirmOpen, setCancelLessonConfirmOpen] = useState(false);
	const [studentInfoModal, setStudentInfoModal] = useState<{
		open: boolean;
		student: StudentInfoModalData | null;
	}>({ open: false, student: null });
	const [pendingEvent, setPendingEvent] = useState<CalendarEvent | null>(null);

	const loadData = useCallback(
		async (showLoading = true) => {
			if (!teacherId) return;

			if (showLoading) {
				setLoading(true);
			}

			const { data: agreementsData, error: agreementsError } = await supabase
				.from('lesson_agreements')
				.select(
					'id, day_of_week, start_time, start_date, end_date, is_active, student_user_id, lesson_type_id, lesson_types(id, name, icon, color, is_group_lesson, duration_minutes)',
				)
				.eq('teacher_id', teacherId)
				.eq('is_active', true);

			if (agreementsData) {
				const studentUserIds = [...new Set(agreementsData.map((a) => a.student_user_id))];
				const { data: profilesData } = await supabase
					.from('profiles')
					.select('user_id, first_name, last_name, email, avatar_url')
					.in('user_id', studentUserIds);

				if (profilesData && agreementsData) {
					const profilesMap = new Map(profilesData.map((p) => [p.user_id, p]));
					for (const agreement of agreementsData) {
						(agreement as unknown as LessonAgreementWithStudent).profiles =
							profilesMap.get(agreement.student_user_id) || null;
					}
				}
			}

			if (agreementsError) {
				console.error('Error loading agreements:', agreementsError);
				toast.error('Fout bij laden lesovereenkomsten');
				setLoading(false);
				return;
			}

			const { data: deviationsData, error: deviationsError } = await supabase
				.from('lesson_appointment_deviations')
				.select(
					'id, lesson_agreement_id, original_date, original_start_time, actual_date, actual_start_time, reason, is_cancelled, lesson_agreements(id, day_of_week, start_time, start_date, end_date, is_active, student_user_id, lesson_type_id, lesson_types(id, name, icon, color))',
				)
				.eq('lesson_agreements.teacher_id', teacherId);

			if (deviationsData && deviationsData.length > 0) {
				const studentUserIds: string[] = [];
				for (const deviation of deviationsData) {
					const la = Array.isArray(deviation.lesson_agreements)
						? deviation.lesson_agreements[0]
						: deviation.lesson_agreements;
					if (la && typeof la === 'object' && 'student_user_id' in la && la.student_user_id) {
						studentUserIds.push(la.student_user_id as string);
					}
				}
				const uniqueStudentUserIds = [...new Set(studentUserIds)];
				if (uniqueStudentUserIds.length > 0) {
					const { data: profilesData } = await supabase
						.from('profiles')
						.select('user_id, first_name, last_name, email, avatar_url')
						.in('user_id', uniqueStudentUserIds);

					if (profilesData) {
						const profilesMap = new Map(profilesData.map((p) => [p.user_id, p]));
						for (const deviation of deviationsData) {
							const la = Array.isArray(deviation.lesson_agreements)
								? deviation.lesson_agreements[0]
								: deviation.lesson_agreements;
							if (la && typeof la === 'object' && 'student_user_id' in la) {
								(
									la as unknown as {
										profiles: {
											first_name: string | null;
											last_name: string | null;
											email: string;
										} | null;
									}
								).profiles = profilesMap.get(la.student_user_id as string) || null;
							}
						}
					}
				}
			}

			if (deviationsError) {
				console.error('Error loading deviations:', deviationsError);
				toast.error('Fout bij laden afwijkingen');
				setLoading(false);
				return;
			}

			setAgreements((agreementsData as unknown as LessonAgreementWithStudent[]) ?? []);
			setDeviations((deviationsData as unknown as LessonAppointmentDeviationWithAgreement[]) ?? []);
			setLoading(false);
		},
		[teacherId],
	);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const deviationsMap = useMemo(() => {
		const map = new Map<string, LessonAppointmentDeviationWithAgreement>();
		for (const deviation of deviations) {
			const key = `${deviation.lesson_agreement_id}-${deviation.original_date}`;
			map.set(key, deviation);
		}
		return map;
	}, [deviations]);

	const events = useMemo(() => {
		const startDate = new Date(currentDate);
		startDate.setMonth(startDate.getMonth() - 1);
		const endDate = new Date(currentDate);
		endDate.setMonth(endDate.getMonth() + 2);

		const baseEvents = generateRecurringEvents(agreements, startDate, endDate, deviationsMap);

		if (pendingEvent) {
			const filteredEvents = baseEvents.filter((e) => {
				const isSameAgreement = e.resource.agreementId === pendingEvent.resource.agreementId;
				if (pendingEvent.resource.deviationId) {
					return !(isSameAgreement && e.resource.deviationId === pendingEvent.resource.deviationId);
				}
				const pendingOriginalDate = pendingEvent.resource.originalDate;
				if (pendingOriginalDate && e.start) {
					const eventDateStr = new Date(e.start).toISOString().split('T')[0];
					return !(isSameAgreement && eventDateStr === pendingOriginalDate);
				}
				return true;
			});
			return [...filteredEvents, pendingEvent];
		}

		return baseEvents;
	}, [agreements, deviationsMap, currentDate, pendingEvent]);

	const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
		if (!canEdit || !user) return;

		const agreement = agreements.find((a) => a.id === event.resource.agreementId);
		if (!agreement) return;

		const isExistingDeviation = event.resource.isDeviation && event.resource.deviationId;

		let originalDateStr: string;
		let originalStartTime: string;

		if (isExistingDeviation && event.resource.originalDate && event.resource.originalStartTime) {
			originalDateStr = event.resource.originalDate;
			originalStartTime = event.resource.originalStartTime;
		} else {
			const originalDate = getDateForDayOfWeek(agreement.day_of_week, start);
			originalDateStr = originalDate.toISOString().split('T')[0];
			originalStartTime = agreement.start_time;
		}

		const actualDateStr = start.toISOString().split('T')[0];
		const actualStartTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;

		const pendingEventData: CalendarEvent = {
			...event,
			start,
			end,
			resource: {
				...event.resource,
				originalDate: originalDateStr,
				originalStartTime,
				isPending: true,
			},
		};
		setPendingEvent(pendingEventData);

		const existingDeviation = deviations.find(
			(d) => d.lesson_agreement_id === agreement.id && d.original_date === originalDateStr,
		);

		const isRestoringToOriginal = originalDateStr === actualDateStr && originalStartTime === actualStartTime;

		if (existingDeviation) {
			const { error } = await supabase
				.from('lesson_appointment_deviations')
				.update({
					actual_date: actualDateStr,
					actual_start_time: actualStartTime,
					last_updated_by_user_id: user.id,
				})
				.eq('id', existingDeviation.id);

			if (error) {
				console.error('Error updating deviation:', error);
				toast.error('Fout bij bijwerken afwijking');
				setPendingEvent(null);
				return;
			}

			if (isRestoringToOriginal) {
				toast.success('Les teruggezet naar originele planning');
			} else {
				toast.success('Afspraak bijgewerkt');
			}
		} else {
			const { error } = await supabase.from('lesson_appointment_deviations').insert({
				lesson_agreement_id: agreement.id,
				original_date: originalDateStr,
				original_start_time: originalStartTime,
				actual_date: actualDateStr,
				actual_start_time: actualStartTime,
				created_by_user_id: user.id,
				last_updated_by_user_id: user.id,
			});

			if (error) {
				console.error('Error creating deviation:', error);
				toast.error('Fout bij aanmaken afwijking');
				setPendingEvent(null);
				return;
			}

			toast.success('Afspraak verplaatst');
		}

		await loadData(false);
		setPendingEvent(null);
	};

	const handleEventClick = (event: CalendarEvent) => {
		if (!canEdit) return;
		setSelectedEvent(event);
		setIsModalOpen(true);
	};

	const handleCancelLesson = async () => {
		if (!selectedEvent || !user) return;

		setIsCancelling(true);

		const agreement = agreements.find((a) => a.id === selectedEvent.resource.agreementId);
		if (!agreement) {
			setIsCancelling(false);
			return;
		}

		const isCancelled = selectedEvent.resource.isCancelled;
		const isExistingDeviation = selectedEvent.resource.deviationId;

		let originalDateStr: string;
		let originalStartTime: string;

		if (selectedEvent.resource.originalDate && selectedEvent.resource.originalStartTime) {
			originalDateStr = selectedEvent.resource.originalDate;
			originalStartTime = selectedEvent.resource.originalStartTime;
		} else {
			originalDateStr = selectedEvent.start
				? new Date(selectedEvent.start).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0];
			originalStartTime = agreement.start_time;
		}

		if (isCancelled && isExistingDeviation) {
			const { error } = await supabase
				.from('lesson_appointment_deviations')
				.delete()
				.eq('id', selectedEvent.resource.deviationId);

			if (error) {
				console.error('Error restoring lesson:', error);
				toast.error('Fout bij herstellen les');
				setIsCancelling(false);
				return;
			}

			toast.success('Les hersteld');
		} else if (isExistingDeviation) {
			const { error } = await supabase
				.from('lesson_appointment_deviations')
				.update({
					is_cancelled: true,
					actual_date: originalDateStr,
					actual_start_time: originalStartTime,
					last_updated_by_user_id: user.id,
				})
				.eq('id', selectedEvent.resource.deviationId);

			if (error) {
				console.error('Error cancelling lesson:', error);
				toast.error('Fout bij annuleren les');
				setIsCancelling(false);
				return;
			}

			toast.success('Les geannuleerd');
		} else {
			const { error } = await supabase.from('lesson_appointment_deviations').insert({
				lesson_agreement_id: agreement.id,
				original_date: originalDateStr,
				original_start_time: originalStartTime,
				actual_date: originalDateStr,
				actual_start_time: originalStartTime,
				is_cancelled: true,
				created_by_user_id: user.id,
				last_updated_by_user_id: user.id,
			});

			if (error) {
				console.error('Error cancelling lesson:', error);
				toast.error('Fout bij annuleren les');
				setIsCancelling(false);
				return;
			}

			toast.success('Les geannuleerd');
		}

		setIsCancelling(false);
		setIsModalOpen(false);
		setSelectedEvent(null);
		loadData(false);
	};

	const handleRevertToOriginal = async () => {
		if (
			!user ||
			!selectedEvent?.resource.deviationId ||
			!selectedEvent.resource.originalDate ||
			!selectedEvent.resource.originalStartTime
		)
			return;
		setIsReverting(true);
		const { error } = await supabase
			.from('lesson_appointment_deviations')
			.update({
				actual_date: selectedEvent.resource.originalDate,
				actual_start_time: selectedEvent.resource.originalStartTime,
				last_updated_by_user_id: user.id,
			})
			.eq('id', selectedEvent.resource.deviationId);

		if (error) {
			console.error('Error reverting deviation:', error);
			toast.error('Fout bij terugzetten afspraak');
			setIsReverting(false);
			return;
		}
		toast.success('Afspraak teruggezet naar origineel');
		setIsReverting(false);
		setIsModalOpen(false);
		setSelectedEvent(null);
		loadData(false);
	};

	const eventStyleGetter = (event: CalendarEvent) => {
		if (currentView === 'agenda') {
			return {
				style: {
					backgroundColor: 'transparent',
					border: 'none',
					color: 'inherit',
					opacity: 1,
				},
			};
		}

		const isDeviation = event.resource.isDeviation;
		const isCancelled = event.resource.isCancelled;
		const isGroupLesson = event.resource.isGroupLesson;
		const isPending = event.resource.isPending;

		let backgroundColor: string;
		let borderColor: string;

		if (isCancelled) {
			backgroundColor = '#ef4444';
			borderColor = '#dc2626';
		} else if (isDeviation || isPending) {
			backgroundColor = '#f59e0b';
			borderColor = '#d97706';
		} else if (isGroupLesson) {
			backgroundColor = '#6366f1';
			borderColor = '#4f46e5';
		} else {
			backgroundColor = '#10b981';
			borderColor = '#059669';
		}

		let opacity = 0.9;
		if (isCancelled) {
			opacity = 0.5;
		} else if (isPending) {
			opacity = 0.5;
		}

		return {
			style: {
				backgroundColor,
				borderColor,
				borderStyle: isPending ? 'dashed' : 'solid',
				borderWidth: '1px',
				borderLeftWidth: '4px',
				color: '#fff',
				borderRadius: '4px',
				opacity,
			},
		};
	};

	const scrollToTime = useMemo(() => {
		const now = new Date();
		if (now.getHours() >= AVAILABILITY_SETTINGS.END_HOUR) {
			return new Date(0, 0, 0, AVAILABILITY_SETTINGS.START_HOUR, 0, 0);
		}
		return now;
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LuLoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="popschool-calendar rounded-lg border border-border bg-card overflow-hidden">
				<div className="h-[600px]">
					<DragAndDropCalendar
						localizer={calendarLocalizer}
						formats={dutchFormats}
						culture="nl-NL"
						events={events}
						startAccessor={(event) => (event as CalendarEvent).start}
						endAccessor={(event) => (event as CalendarEvent).end}
						view={currentView}
						onView={setCurrentView}
						date={currentDate}
						onNavigate={setCurrentDate}
						onSelectEvent={(event) => handleEventClick(event as CalendarEvent)}
						onEventDrop={canEdit ? handleEventDrop : undefined}
						onEventResize={canEdit ? handleEventDrop : undefined}
						draggableAccessor={() => canEdit}
						resizableAccessor={() => canEdit}
						eventPropGetter={eventStyleGetter}
						tooltipAccessor={(event) => buildTooltipText(event as CalendarEvent)}
						components={{
							// biome-ignore lint/suspicious/noExplicitAny: react-big-calendar event component typing is complex
							event: AgendaEvent as unknown as React.ComponentType<any>,
						}}
						min={new Date(0, 0, 0, 9, 0, 0)}
						max={new Date(0, 0, 0, 21, 0, 0)}
						scrollToTime={scrollToTime}
						step={30}
						timeslots={1}
						messages={{
							next: 'Volgende',
							previous: 'Vorige',
							today: 'Vandaag',
							month: 'Maand',
							week: 'Week',
							day: 'Dag',
							agenda: 'Agenda',
							date: 'Datum',
							time: 'Tijd',
							event: 'Afspraak',
							noEventsInRange: 'Geen afspraken in dit bereik',
							showMore: (total) => `+${total} meer`,
						}}
					/>
				</div>
			</div>

			<Legend show={currentView !== 'agenda'} />

			<DetailModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				event={selectedEvent}
				canEdit={canEdit}
				isCancelling={isCancelling}
				isReverting={isReverting}
				onCancelLesson={handleCancelLesson}
				onRevertToOriginal={handleRevertToOriginal}
				onOpenCancelConfirm={() => setCancelLessonConfirmOpen(true)}
				onOpenStudentInfo={(student) =>
					setStudentInfoModal({
						open: true,
						student,
					})
				}
			/>

			<ConfirmCancelDialog
				open={cancelLessonConfirmOpen}
				onOpenChange={setCancelLessonConfirmOpen}
				onConfirm={handleCancelLesson}
				disabled={isCancelling}
			/>

			<StudentInfoModal
				open={studentInfoModal.open}
				onOpenChange={(open) => setStudentInfoModal({ ...studentInfoModal, open })}
				student={studentInfoModal.student}
			/>
		</div>
	);
}