import { describe, expect, it } from 'bun:test';
import {
	getWizardPrimaryButtonLabel,
	isWizardNextEnabled,
	isWizardSaveDisabled,
} from '../../../src/components/agreements/wizardNavigationUiHelpers';
import type { SlotWithStatus } from '../../../src/lib/agreementSlots';

const freeSlot = {
	day_of_week: 1,
	start_time: '09:00',
	end_time: '09:30',
	status: 'free',
	totalOccurrences: 1,
	occupiedOccurrences: 0,
} as SlotWithStatus;

describe('isWizardSaveDisabled', () => {
	it('disables save without a slot', () => {
		expect(
			isWizardSaveDisabled({
				slot: null,
				saving: false,
				isTeacherOwnStudent: false,
				isEditMode: false,
				hasChanges: true,
			}),
		).toBe(true);
	});

	it('disables save for occupied slots', () => {
		expect(
			isWizardSaveDisabled({
				slot: { ...freeSlot, status: 'occupied' },
				saving: false,
				isTeacherOwnStudent: false,
				isEditMode: false,
				hasChanges: true,
			}),
		).toBe(true);
	});

	it('disables save when teacher is own student', () => {
		expect(
			isWizardSaveDisabled({
				slot: freeSlot,
				saving: false,
				isTeacherOwnStudent: true,
				isEditMode: false,
				hasChanges: true,
			}),
		).toBe(true);
	});

	it('enables save when all requirements are met', () => {
		expect(
			isWizardSaveDisabled({
				slot: freeSlot,
				saving: false,
				isTeacherOwnStudent: false,
				isEditMode: false,
				hasChanges: false,
			}),
		).toBe(false);
	});

	it('disables save in edit mode without changes', () => {
		expect(
			isWizardSaveDisabled({
				slot: freeSlot,
				saving: false,
				isTeacherOwnStudent: false,
				isEditMode: true,
				hasChanges: false,
			}),
		).toBe(true);
	});
});

describe('isWizardNextEnabled', () => {
	it('allows next when revisiting an earlier step', () => {
		expect(isWizardNextEnabled(1, 3, false)).toBe(true);
	});

	it('requires stepCanProceed on the current highest step', () => {
		expect(isWizardNextEnabled(3, 3, false)).toBe(false);
		expect(isWizardNextEnabled(3, 3, true)).toBe(true);
	});
});

describe('getWizardPrimaryButtonLabel', () => {
	it('returns Volgende before the last step', () => {
		expect(getWizardPrimaryButtonLabel(false, false, false)).toBe('Volgende');
	});

	it('returns Opslaan... while saving', () => {
		expect(getWizardPrimaryButtonLabel(true, true, false)).toBe('Opslaan...');
	});

	it('returns Bevestigen on the last create step', () => {
		expect(getWizardPrimaryButtonLabel(true, false, false)).toBe('Bevestigen');
	});

	it('returns Opslaan on the last edit step', () => {
		expect(getWizardPrimaryButtonLabel(true, false, true)).toBe('Opslaan');
	});
});
