import { describe, expect, it } from 'bun:test';
import {
	formatWizardPeriodRange,
	isWizardPeriodChanged,
	isWizardSlotChanged,
	isWizardTeacherChanged,
} from '../../../src/components/agreements/confirmStepHelpers';

describe('confirmStepHelpers', () => {
	it('formats wizard period range', () => {
		expect(formatWizardPeriodRange('2025-02-01', '2025-06-01')).toBe('01-02-2025 t/m 01-06-2025');
		expect(formatWizardPeriodRange('2025-02-01', null)).toBe('01-02-2025 t/m -');
	});

	it('detects period, teacher and slot changes', () => {
		expect(isWizardPeriodChanged('2025-02-01', '2025-06-01', '2025-02-01', '2025-06-01')).toBe(false);
		expect(isWizardPeriodChanged('2025-02-01', '2025-06-01', '2025-03-01', '2025-06-01')).toBe(true);
		expect(isWizardTeacherChanged('teacher-a', 'teacher-a')).toBe(false);
		expect(isWizardTeacherChanged('teacher-a', 'teacher-b')).toBe(true);
		expect(
			isWizardSlotChanged(
				{ day_of_week: 1, start_time: '14:00:00' } as Parameters<typeof isWizardSlotChanged>[0],
				{
					day_of_week: 1,
					start_time: '14:00:00',
					end_time: '15:00:00',
					status: 'free',
					occupiedOccurrences: 0,
					totalOccurrences: 0,
				},
			),
		).toBe(false);
	});
});
