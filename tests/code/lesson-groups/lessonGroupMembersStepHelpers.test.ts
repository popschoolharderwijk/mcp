import { describe, expect, it } from 'bun:test';
import {
	formatLessonGroupMemberCount,
	getLessonGroupMembersPlaceholder,
	toggleSelectedRequestId,
} from '../../../src/components/lesson-groups/wizard/lessonGroupMembersStepHelpers';

describe('getLessonGroupMembersPlaceholder', () => {
	it('returns empty-state placeholder when no eligible students exist', () => {
		expect(getLessonGroupMembersPlaceholder(0)).toBe('Geen leerlingen aangemeld voor deze lessoort');
	});

	it('returns add placeholder when eligible students exist', () => {
		expect(getLessonGroupMembersPlaceholder(3)).toBe('Voeg leerlingen toe...');
	});
});

describe('formatLessonGroupMemberCount', () => {
	it('uses singular label for one student', () => {
		expect(formatLessonGroupMemberCount(1)).toBe('Geselecteerd: 1 leerling');
	});

	it('uses plural label for multiple students', () => {
		expect(formatLessonGroupMemberCount(4)).toBe('Geselecteerd: 4 leerlingen');
	});
});

describe('toggleSelectedRequestId', () => {
	it('adds request id when checked', () => {
		expect(toggleSelectedRequestId(['req-1'], 'req-2', true)).toEqual(['req-1', 'req-2']);
	});

	it('removes request id when unchecked', () => {
		expect(toggleSelectedRequestId(['req-1', 'req-2'], 'req-1', false)).toEqual(['req-2']);
	});
});
