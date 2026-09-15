import { describe, expect, it } from 'bun:test';
import { resolveDashboardAudience } from '../../../src/lib/dashboard/dashboardAudienceHelpers';

describe('resolveDashboardAudience', () => {
	it('returns privileged for admins and staff', () => {
		expect(resolveDashboardAudience(true, false)).toBe('privileged');
		expect(resolveDashboardAudience(true, true)).toBe('privileged');
	});

	it('returns teacher for non-privileged teachers', () => {
		expect(resolveDashboardAudience(false, true)).toBe('teacher');
	});

	it('returns student for everyone else', () => {
		expect(resolveDashboardAudience(false, false)).toBe('student');
	});
});
