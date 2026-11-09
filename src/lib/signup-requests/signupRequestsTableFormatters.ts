import type { SignupRequestRowBase } from '@/lib/signup-requests/signupRequestsPageHelpers';

type SignupLessonTypeSecondary = { kind: 'group'; groupName: string } | { kind: 'waitlist' } | null;

export interface SignupLessonTypeCellContent {
	lessonTypeName: string | null;
	groupLabel: string | null;
	showWaitlistBadge: boolean;
	optionLabel: string | null;
}

function getSignupLessonTypeSecondary(
	row: Pick<SignupRequestRowBase, 'lesson_group_name' | 'is_group_lesson'>,
): SignupLessonTypeSecondary {
	if (row.lesson_group_name) {
		return { kind: 'group', groupName: row.lesson_group_name };
	}
	if (row.is_group_lesson) {
		return { kind: 'waitlist' };
	}
	return null;
}

function formatSignupGroupLabel(groupName: string): string {
	return `Groep: ${groupName}`;
}

export function getSignupLessonTypeCellContent(row: SignupRequestRowBase): SignupLessonTypeCellContent {
	const secondary = getSignupLessonTypeSecondary(row);
	return {
		lessonTypeName: row.lesson_type_name,
		groupLabel: secondary?.kind === 'group' ? formatSignupGroupLabel(secondary.groupName) : null,
		showWaitlistBadge: secondary?.kind === 'waitlist',
		optionLabel: row.option_label,
	};
}

export function getSignupStatusDisplayLabel(status: SignupRequestRowBase['status']): string {
	if (status === 'trial_scheduled') {
		return 'proefles ingepland';
	}
	return status;
}

function formatSignupTrialTimePart(time: string | null): string | null {
	if (!time) {
		return null;
	}
	return time.slice(0, 5);
}

function appendSignupTrialDetail(line: string, part: string | null): string {
	if (!part) {
		return line;
	}
	return `${line} · ${part}`;
}

export function formatSignupTrialScheduledLine(
	row: Pick<SignupRequestRowBase, 'status' | 'trial_scheduled_date' | 'trial_scheduled_time' | 'trial_teacher_name'>,
	formatDate: (date: string) => string,
): string | null {
	if (row.status !== 'trial_scheduled' || !row.trial_scheduled_date) {
		return null;
	}

	const withTime = appendSignupTrialDetail(
		formatDate(row.trial_scheduled_date),
		formatSignupTrialTimePart(row.trial_scheduled_time),
	);
	return appendSignupTrialDetail(withTime, row.trial_teacher_name);
}

export function isSignupRequestActionable(status: SignupRequestRowBase['status']): boolean {
	return status === 'pending' || status === 'trial_scheduled';
}

export function canScheduleTrialForSignupRequest(status: SignupRequestRowBase['status']): boolean {
	return status === 'pending';
}
