import { beforeAll, describe, expect, it, mock } from 'bun:test';

const toastCalls: { kind: 'error' | 'success'; message: string }[] = [];

mock.module('sonner', () => ({
	toast: {
		error: (message: string) => {
			toastCalls.push({ kind: 'error', message });
		},
		success: (message: string) => {
			toastCalls.push({ kind: 'success', message });
		},
	},
}));

const editingOption = {
	id: 'option-1',
	duration_minutes: '45',
	frequency: 'weekly' as const,
	label: '',
	billing_kind: 'monthly' as const,
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '20',
	amount_adult: '25',
	tariffs: [],
};

describe('runSaveOptionInModal', () => {
	let helpers: typeof import('../../../src/pages/lesson-type-info/lessonTypeOptionModalHelpers');

	beforeAll(async () => {
		helpers = await import('../../../src/pages/lesson-type-info/lessonTypeOptionModalHelpers');
	});

	it('shows validation toast and skips save handlers', async () => {
		toastCalls.length = 0;
		let updated = false;
		await helpers.runSaveOptionInModal({
			flow: { kind: 'abort-validation', message: 'Duur moet een positief getal zijn' },
			editingOption: editingOption as never,
			optionModalForm: {
				duration_minutes: '45',
				frequency: 'weekly',
				label: '',
				billing_kind: 'monthly' as const,
				has_adult_tariff: true,
				effective_from: '2026-09-01',
				amount_under_21: '20',
				amount_adult: '25',
			},
			updateExistingOptionInForm: () => {
				updated = true;
				return true;
			},
			persistExistingOption: async () => true,
			persistNewOption: async () => true,
			clearEditingOption: () => {},
		});
		expect(toastCalls).toEqual([{ kind: 'error', message: 'Duur moet een positief getal zijn' }]);
		expect(updated).toBe(false);
	});

	it('clears editing option after local update success', async () => {
		toastCalls.length = 0;
		let cleared = false;
		await helpers.runSaveOptionInModal({
			flow: { kind: 'update-existing', persistToDatabase: false },
			editingOption: editingOption as never,
			optionModalForm: {
				duration_minutes: '45',
				frequency: 'weekly',
				label: '',
				billing_kind: 'monthly' as const,
				has_adult_tariff: true,
				effective_from: '2026-09-01',
				amount_under_21: '20',
				amount_adult: '25',
			},
			updateExistingOptionInForm: () => true,
			persistExistingOption: async () => true,
			persistNewOption: async () => true,
			clearEditingOption: () => {
				cleared = true;
			},
		});
		expect(cleared).toBe(true);
		expect(toastCalls).toEqual([{ kind: 'success', message: 'Optie bijgewerkt' }]);
	});

	it('clears editing option after successful create', async () => {
		toastCalls.length = 0;
		let cleared = false;
		await helpers.runSaveOptionInModal({
			flow: { kind: 'create-new' },
			editingOption: editingOption as never,
			optionModalForm: {
				duration_minutes: '45',
				frequency: 'weekly',
				label: '',
				billing_kind: 'monthly' as const,
				has_adult_tariff: true,
				effective_from: '2026-09-01',
				amount_under_21: '20',
				amount_adult: '25',
			},
			updateExistingOptionInForm: () => true,
			persistExistingOption: async () => true,
			persistNewOption: async () => true,
			clearEditingOption: () => {
				cleared = true;
			},
		});
		expect(cleared).toBe(true);
		expect(toastCalls).toHaveLength(0);
	});
});
