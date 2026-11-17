import { describe, expect, it } from 'bun:test';
import { FREQUENCY_LABELS, getFrequencyLabel } from '../../../src/lib/frequenciesHelpers';

describe('getFrequencyLabel', () => {
	it('returns empty string for missing frequency', () => {
		expect(getFrequencyLabel(null)).toBe('');
		expect(getFrequencyLabel(undefined)).toBe('');
		expect(getFrequencyLabel('')).toBe('');
	});

	it('returns Dutch labels for known frequencies', () => {
		expect(getFrequencyLabel('daily')).toBe(FREQUENCY_LABELS.daily);
		expect(getFrequencyLabel('weekly')).toBe(FREQUENCY_LABELS.weekly);
		expect(getFrequencyLabel('biweekly')).toBe(FREQUENCY_LABELS.biweekly);
		expect(getFrequencyLabel('monthly')).toBe(FREQUENCY_LABELS.monthly);
	});

	it('returns the raw value for unknown frequencies', () => {
		expect(getFrequencyLabel('fortnightly')).toBe('fortnightly');
	});
});
