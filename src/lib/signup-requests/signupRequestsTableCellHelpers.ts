import type { SignupLessonTypeCellContent } from '@/lib/signup-requests/signupRequestsTableFormatters';

export type SignupLessonTypeCellLine = { kind: 'text'; text: string; muted?: boolean } | { kind: 'waitlist-badge' };

export function buildSignupLessonTypeCellLines(content: SignupLessonTypeCellContent): SignupLessonTypeCellLine[] {
	const lines: SignupLessonTypeCellLine[] = [{ kind: 'text', text: content.lessonTypeName ?? '' }];

	if (content.groupLabel) {
		lines.push({ kind: 'text', text: content.groupLabel, muted: true });
	}
	if (content.showWaitlistBadge) {
		lines.push({ kind: 'waitlist-badge' });
	}
	if (content.optionLabel) {
		lines.push({ kind: 'text', text: content.optionLabel, muted: true });
	}

	return lines;
}
