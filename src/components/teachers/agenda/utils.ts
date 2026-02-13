import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Formats } from 'react-big-calendar';
import { formatDate, formatTimeString } from '@/lib/dateHelpers';
import type { LessonAgreementWithStudent, LessonAppointmentDeviationWithAgreement } from '@/types/lesson-agreements';
import type { CalendarEvent } from './types';

export const dutchFormats: Formats = {
	timeGutterFormat: (date: Date) => format(date, 'HH:mm', { locale: nl }),
	eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
		`${format(start, 'HH:mm', { locale: nl })} - ${format(end, 'HH:mm', { locale: nl })}`,
	dayFormat: (date: Date) => format(date, 'EEEE d', { locale: nl }),
	dayHeaderFormat: (date: Date) => format(date, 'EEEE d MMMM', { locale: nl }),
	dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
		`${format(start, 'd MMM', { locale: nl })} - ${format(end, 'd MMM', { locale: nl })} ${format(end, 'yyyy', { locale: nl })}`,
	monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: nl }),
	weekdayFormat: (date: Date) => format(date, 'EEE', { locale: nl }),
	agendaTimeFormat: (date: Date) => format(date, 'HH:mm', { locale: nl }),
	agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
		`${format(start, 'HH:mm', { locale: nl })} - ${format(end, 'HH:mm', { locale: nl })}`,
	agendaDateFormat: (date: Date) => format(date, 'EEEE d MMMM', { locale: nl }),
	agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
		`${format(start, 'd MMM', { locale: nl })} - ${format(end, 'd MMM', { locale: nl })} ${format(end, 'yyyy', { locale: nl })}`,
	selectRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
		`${format(start, 'HH:mm', { locale: nl })} - ${format(end, 'HH:mm', { locale: nl })}`,
};

export function getDateForDayOfWeek(dayOfWeek: number, referenceDate: Date): Date {
	const date = new Date(referenceDate);
	const currentDay = date.getDay();
	const diff = dayOfWeek - currentDay;
	date.setDate(date.getDate() + diff);
	return date;
}

export function generateRecurringEvents(
	agreements: LessonAgreementWithStudent[],
	rangeStart: Date,
	rangeEnd: Date,
	deviations: Map<string, LessonAppointmentDeviationWithAgreement>,
): CalendarEvent[] {
	const events: CalendarEvent[] = [];

	const groupedAgreements = new Map<string, LessonAgreementWithStudent[]>();
	for (const agreement of agreements) {
		const key = `${agreement.day_of_week}-${agreement.start_time}-${agreement.lesson_type_id}`;
		const existing = groupedAgreements.get(key) || [];
		existing.push(agreement);
		groupedAgreements.set(key, existing);
	}

	for (const [, group] of groupedAgreements) {
		const firstAgreement = group[0];
		const isGroupLesson = firstAgreement.lesson_types.is_group_lesson;
		const durationMinutes = firstAgreement.lesson_types.duration_minutes || 30;

		const studentNames = group.map((a) =>
			a.profiles?.first_name && a.profiles?.last_name
				? `${a.profiles.first_name} ${a.profiles.last_name}`
				: a.profiles?.first_name || a.profiles?.email || 'Onbekend',
		);

		const firstLessonDate = new Date(rangeStart);
		const daysUntilLesson = (firstAgreement.day_of_week - firstLessonDate.getDay() + 7) % 7;
		firstLessonDate.setDate(firstLessonDate.getDate() + daysUntilLesson);

		const earliestStartDate = new Date(Math.min(...group.map((a) => new Date(a.start_date).getTime())));
		const latestEndDate = group.some((a) => !a.end_date)
			? null
			: new Date(
					Math.max(...group.filter((a) => a.end_date).map((a) => new Date(a.end_date as string).getTime())),
				);

		const currentLessonDate = new Date(firstLessonDate);

		while (currentLessonDate <= rangeEnd) {
			if (currentLessonDate >= earliestStartDate && (!latestEndDate || currentLessonDate <= latestEndDate)) {
				const lessonDateStr = currentLessonDate.toISOString().split('T')[0];

				if (!isGroupLesson && group.length === 1) {
					const deviation = deviations.get(`${firstAgreement.id}-${lessonDateStr}`);

					if (deviation) {
						const isCancelled = deviation.is_cancelled;
						const [hours, minutes] = isCancelled
							? deviation.original_start_time.split(':')
							: deviation.actual_start_time.split(':');
						const eventDate = new Date(isCancelled ? deviation.original_date : deviation.actual_date);
						eventDate.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);

						const deviationProfile = deviation.lesson_agreements.profiles;
						const deviationStudentName =
							deviationProfile?.first_name && deviationProfile?.last_name
								? `${deviationProfile.first_name} ${deviationProfile.last_name}`
								: deviationProfile?.first_name || deviationProfile?.email || 'Onbekend';

						const deviationStudentInfo = deviationProfile
							? {
									user_id: deviation.lesson_agreements.student_user_id,
									first_name: deviationProfile.first_name,
									last_name: deviationProfile.last_name,
									email: deviationProfile.email,
									avatar_url: (deviationProfile as { avatar_url?: string | null }).avatar_url ?? null,
								}
							: undefined;

						events.push({
							title: `${deviation.lesson_agreements.lesson_types.name} - ${deviationStudentName}`,
							start: eventDate,
							end: new Date(eventDate.getTime() + durationMinutes * 60 * 1000),
							resource: {
								type: 'deviation',
								agreementId: firstAgreement.id,
								deviationId: deviation.id,
								studentName: deviationStudentName,
								studentInfo: deviationStudentInfo,
								lessonTypeName: deviation.lesson_agreements.lesson_types.name,
								lessonTypeColor: deviation.lesson_agreements.lesson_types.color,
								lessonTypeIcon: deviation.lesson_agreements.lesson_types.icon,
								isDeviation: !isCancelled,
								isCancelled,
								isGroupLesson: false,
								originalDate: deviation.original_date,
								originalStartTime: deviation.original_start_time,
								reason: deviation.reason,
							},
						});
						currentLessonDate.setDate(currentLessonDate.getDate() + 7);
						continue;
					}
				}

				const [hours, minutes] = firstAgreement.start_time.split(':');
				const eventDate = new Date(currentLessonDate);
				eventDate.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);

				const title = isGroupLesson
					? `${firstAgreement.lesson_types.name} (${group.length} deelnemers)`
					: `${firstAgreement.lesson_types.name} - ${studentNames[0]}`;

				const studentInfoList = group
					.filter(
						(
							a,
						): a is LessonAgreementWithStudent & {
							profiles: NonNullable<LessonAgreementWithStudent['profiles']>;
						} => a.profiles !== null,
					)
					.map((a) => ({
						user_id: a.student_user_id,
						first_name: a.profiles.first_name,
						last_name: a.profiles.last_name,
						email: a.profiles.email,
						avatar_url: (a.profiles as { avatar_url?: string | null }).avatar_url ?? null,
					}));

				events.push({
					title,
					start: eventDate,
					end: new Date(eventDate.getTime() + durationMinutes * 60 * 1000),
					resource: {
						type: 'agreement',
						agreementId: firstAgreement.id,
						studentName: isGroupLesson ? studentNames.join(', ') : studentNames[0],
						studentInfo: !isGroupLesson && studentInfoList.length > 0 ? studentInfoList[0] : undefined,
						studentInfoList: isGroupLesson ? studentInfoList : undefined,
						lessonTypeName: firstAgreement.lesson_types.name,
						lessonTypeColor: firstAgreement.lesson_types.color,
						lessonTypeIcon: firstAgreement.lesson_types.icon,
						isDeviation: false,
						isCancelled: false,
						isGroupLesson,
						studentCount: isGroupLesson ? group.length : undefined,
					},
				});
			}

			currentLessonDate.setDate(currentLessonDate.getDate() + 7);
		}
	}

	return events;
}

export function buildTooltipText(event: CalendarEvent): string {
	const {
		isDeviation,
		isCancelled,
		originalDate,
		originalStartTime,
		reason,
		lessonTypeName,
		studentName,
		isGroupLesson,
		studentCount,
	} = event.resource;

	const lines: string[] = [lessonTypeName];

	if (isGroupLesson) {
		lines.push(`${studentCount} deelnemers:`);
		const students = studentName.split(', ');
		for (const student of students) {
			lines.push(`  • ${student}`);
		}
	} else {
		lines.push(studentName);
	}

	if (isCancelled) {
		lines.push('');
		lines.push('❌ Les vervallen');
		if (reason) {
			lines.push(`Reden: ${reason}`);
		}
	} else if (isDeviation) {
		lines.push('');
		lines.push('⚠ Gewijzigde afspraak');
		if (originalDate && originalStartTime) {
			lines.push(`Origineel: ${formatDate(originalDate)} om ${formatTimeString(originalStartTime)}`);
		}
		if (reason) {
			lines.push(`Reden: ${reason}`);
		}
	}

	return lines.join('\n');
}
