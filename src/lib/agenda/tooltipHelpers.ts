import type { CalendarEventResource } from '@/components/agenda/types';
import { formatDbDateLong } from '@/lib/date/date-format';
import { formatTime } from '@/lib/time/time-format';

export function buildTooltipFirstLine(eventTitle: string, resource: CalendarEventResource): string {
	if (resource.sourceType === 'project') {
		return `📁 ${eventTitle}`;
	}
	return resource.lessonTypeName;
}

function formatStudentNamesForTooltip(studentName: string): string {
	return studentName.includes(' & ') ? studentName.split(' & ').join(', ') : studentName;
}

function buildLessonParticipantLines(resource: CalendarEventResource): string[] {
	const { teacherName, studentName, isDuoLesson } = resource;
	const lines: string[] = [];
	if (teacherName) {
		lines.push(`Docent: ${teacherName}`);
	}
	const studentLabel = isDuoLesson || studentName.includes(' & ') ? 'Leerlingen' : 'Leerling';
	lines.push(`${studentLabel}: ${formatStudentNamesForTooltip(studentName)}`);
	return lines;
}

function buildGroupParticipantLines(resource: CalendarEventResource): string[] {
	const { studentCount, studentName, teacherName } = resource;
	const lines: string[] = [];
	if (teacherName) {
		lines.push(`Docent: ${teacherName}`);
	}
	lines.push(`${studentCount} leerlingen:`);
	for (const student of studentName.split(', ')) {
		lines.push(`  • ${student}`);
	}
	return lines;
}

export function buildTooltipParticipantLines(resource: CalendarEventResource): string[] {
	const { isLesson, isGroupLesson, studentName, participantCount, participantNames } = resource;

	if (isLesson && !isGroupLesson) {
		return buildLessonParticipantLines(resource);
	}

	if (isGroupLesson) {
		return buildGroupParticipantLines(resource);
	}

	if ((participantCount ?? 0) > 1 && participantNames?.length) {
		const lines = [`${participantCount} deelnemers:`];
		for (const name of participantNames) {
			lines.push(`  • ${name}`);
		}
		return lines;
	}

	return studentName ? [studentName] : [];
}

export function buildTooltipStatusLines(resource: CalendarEventResource): string[] {
	const { isCancelled, hasTimeOrDateChange, sourceType, reason, originalDate, originalStartTime } = resource;

	if (isCancelled) {
		const lines = [''];
		const cancelledLabel = sourceType === 'lesson_agreement' ? '❌ Les vervallen' : '❌ Afspraak vervallen';
		lines.push(cancelledLabel);
		if (reason) {
			lines.push(`Reden: ${reason}`);
		}
		return lines;
	}

	if (!hasTimeOrDateChange) {
		return [];
	}

	const lines = ['', '⚠ Gewijzigde afspraak'];
	if (originalDate && originalStartTime) {
		lines.push(`Origineel: ${formatDbDateLong(originalDate)} om ${formatTime(originalStartTime)}`);
	}
	if (reason) {
		lines.push(`Reden: ${reason}`);
	}
	return lines;
}
