/** Display helpers for the fixed payment link page. Amounts come from the server (SQL fee rules). */
import { formatCentsNl, formatDateNl } from '@/lib/billing/lessonFeeFormat';

export interface PaymentPreviewLine {
	month: string;
	amountCents: number;
	btwRate: number;
	isProrated: boolean;
}

export interface PaymentLinkInfo {
	valid: boolean;
	arranged?: boolean;
	lesson_form?: string;
	start_date?: string;
	minimum_term_end?: string | null;
	preview?: {
		monthly: PaymentPreviewLine | null;
		firstMonth: PaymentPreviewLine | null;
		catchUp: { lines: PaymentPreviewLine[]; amountCents: number; fromMonth: string; toMonth: string } | null;
	};
}

export type PaymentLinkView = 'token' | 'session';

/** With `t` in the URL the token route is used; otherwise the logged-in/magic-link route. */
export function resolvePaymentLinkView(params: URLSearchParams): PaymentLinkView {
	return params.get('t') ? 'token' : 'session';
}

/** Amount incl. VAT text: "€ 88,79 (incl. 21% btw)" or "€ 73,38 (vrijgesteld van btw)". */
export function formatPreviewAmount(line: Pick<PaymentPreviewLine, 'amountCents' | 'btwRate'>): string {
	const vat = line.btwRate === 21 ? 'incl. 21% btw' : 'vrijgesteld van btw';
	return `${formatCentsNl(line.amountCents)} (${vat})`;
}

/** "oktober 2026" (+ " (naar rato)"). */
export function formatPreviewMonth(line: Pick<PaymentPreviewLine, 'month' | 'isProrated'>): string {
	const label = new Date(`${line.month}T12:00:00`).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
	return line.isProrated ? `${label} (naar rato)` : label;
}

export function formatTermText(minimumTermEnd: string | null | undefined): string {
	const base = 'daarna loopt de overeenkomst per schooljaar door (tot 31 juli) en wordt stilzwijgend verlengd.';
	if (!minimumTermEnd) return `Eerste periode van 6 maanden; ${base}`;
	return `Eerste periode tot en met ${formatDateNl(minimumTermEnd)}; ${base}`;
}

/** Edge-function error body → whether the customer should get the "new link" form. */
export function isInvalidLinkResponse(data: unknown): boolean {
	return typeof data === 'object' && data !== null && (data as { invalid_link?: unknown }).invalid_link === true;
}
