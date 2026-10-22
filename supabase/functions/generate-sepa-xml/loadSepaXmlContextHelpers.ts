import type { BatchRow, ItemRow, SettingsRow } from './types.ts';

export function resolveSepaSettingsLoadFailure(
	settings: SettingsRow | null | undefined,
	errorMessage: string | undefined,
): { status: number; error: string } | null {
	if (errorMessage || !settings) {
		return { status: 500, error: 'Boekhoud-instellingen ontbreken' };
	}
	return null;
}

export function resolveSepaSettingsIncomplete(settings: SettingsRow): { status: number; error: string } | null {
	if (!settings.sepa_creditor_name || !settings.sepa_creditor_iban || !settings.sepa_creditor_id) {
		return { status: 422, error: 'Vul eerst alle SEPA-crediteurgegevens in' };
	}
	return null;
}

export function normalizeSepaSettings(settings: SettingsRow): SettingsRow & {
	sepa_creditor_name: string;
	sepa_creditor_iban: string;
	sepa_creditor_id: string;
} {
	return {
		...settings,
		sepa_creditor_name: settings.sepa_creditor_name as string,
		sepa_creditor_iban: settings.sepa_creditor_iban as string,
		sepa_creditor_id: settings.sepa_creditor_id as string,
	};
}

export function resolveSepaBatchLoadFailure(
	batch: BatchRow | null | undefined,
	errorMessage: string | undefined,
): { status: number; error: string } | null {
	if (errorMessage || !batch) {
		return { status: 404, error: 'Batch niet gevonden' };
	}
	return null;
}

export function resolveSepaBatchStatusFailure(batch: BatchRow): { status: number; error: string } | null {
	if (batch.status !== 'approved' && batch.status !== 'submitted') {
		return { status: 409, error: 'Batch is niet goedgekeurd' };
	}
	return null;
}

export function resolveSepaBatchItemsFailure(
	items: ItemRow[] | null | undefined,
	errorMessage: string | undefined,
): { status: number; error: string } | null {
	if (errorMessage) {
		return { status: 500, error: errorMessage };
	}
	if (!items || items.length === 0) {
		return { status: 422, error: 'Geen regels in batch' };
	}
	return null;
}
