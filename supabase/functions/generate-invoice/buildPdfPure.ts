// Edge mirror of PRIMARY_HEX in src/lib/color/brand-hex.ts — keep PDF header fill in sync; see buildPdfPure.test.ts

import type { StudentInfo } from './types.ts';

/** Normalized sRGB for pdf-lib rgb(); matches brand primary #c4ab7c */
export const PDF_RGB = {
	red: 0.7686274509803922,
	green: 0.6705882352941176,
	blue: 0.48627450980392156,
} as const;

export const PDF_GRAY_TEXT_RGB = { red: 0.3, green: 0.3, blue: 0.3 } as const;

export const PDF_BLACK_RGB = { red: 0.1, green: 0.1, blue: 0.1 } as const;

export const PDF_WHITE_RGB = { red: 1, green: 1, blue: 1 } as const;

export function buildCompanyBlockLines(settings: Record<string, unknown>): string[] {
	return [
		settings.company_address ? String(settings.company_address) : null,
		settings.company_postcode || settings.company_city
			? `${settings.company_postcode ?? ''} ${settings.company_city ?? ''}`.trim()
			: null,
		settings.company_email ? String(settings.company_email) : null,
		settings.company_phone ? `Tel: ${settings.company_phone}` : null,
		settings.company_kvk ? `KvK: ${settings.company_kvk}` : null,
		settings.company_btw_nummer ? `BTW: ${settings.company_btw_nummer}` : null,
	].filter((line): line is string => Boolean(line));
}

export function shouldUseDebtorBillTo(student: StudentInfo): boolean {
	return !student.debtor_info_same_as_student && Boolean(student.debtor_name);
}

export function resolveBillToName(student: StudentInfo, useDebtor: boolean): string {
	if (useDebtor) return String(student.debtor_name ?? '');
	return `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || student.email;
}

export function resolveBillToCityLine(student: StudentInfo): string | null {
	if (!student.debtor_postal_code && !student.debtor_city) return null;
	return `${student.debtor_postal_code ?? ''} ${student.debtor_city ?? ''}`.trim();
}

export function resolveBillToEmail(student: StudentInfo): string {
	return student.parent_email ?? student.email;
}

export function buildPdfPaymentNoteText(
	settings: Record<string, unknown>,
	dueDate: string,
	mandateRef: string | null,
	formatDueDate: (iso: string) => string,
): string {
	if (mandateRef) {
		return `Dit bedrag wordt automatisch geïncasseerd op of rond ${formatDueDate(dueDate)} via SEPA-mandaat ${mandateRef}.`;
	}
	const ibanStr = String(settings.company_iban ?? '');
	return `Gelieve het bedrag binnen ${settings.invoice_payment_term_days ?? 14} dagen over te maken naar ${ibanStr}.`;
}
