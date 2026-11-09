import { describe, expect, it } from 'bun:test';
import { buildSignupLessonTypeCellLines } from '../../../src/lib/signup-requests/signupRequestsTableCellHelpers';

describe('buildSignupLessonTypeCellLines', () => {
	it('builds lines for a group lesson with all fields', () => {
		expect(
			buildSignupLessonTypeCellLines({
				lessonTypeName: 'Piano',
				groupLabel: 'Groep: Groep A',
				showWaitlistBadge: false,
				optionLabel: '45 min',
			}),
		).toEqual([
			{ kind: 'text', text: 'Piano' },
			{ kind: 'text', text: 'Groep: Groep A', muted: true },
			{ kind: 'text', text: '45 min', muted: true },
		]);
	});

	it('includes waitlist badge when no group is selected', () => {
		expect(
			buildSignupLessonTypeCellLines({
				lessonTypeName: 'Piano',
				groupLabel: null,
				showWaitlistBadge: true,
				optionLabel: null,
			}),
		).toEqual([{ kind: 'text', text: 'Piano' }, { kind: 'waitlist-badge' }]);
	});

	it('returns only lesson type name for minimal individual lessons', () => {
		expect(
			buildSignupLessonTypeCellLines({
				lessonTypeName: 'Gitaar',
				groupLabel: null,
				showWaitlistBadge: false,
				optionLabel: null,
			}),
		).toEqual([{ kind: 'text', text: 'Gitaar' }]);
	});
});
