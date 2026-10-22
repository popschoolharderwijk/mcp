import { needsCatchUp } from './catchUpInvoicePure.ts';

export function shouldCatchUp(input: {
	startDate: string;
	today: string;
	storedScheduleId?: string | null;
	firstInvoiceStatus?: string | null;
}): boolean {
	return !input.storedScheduleId && !input.firstInvoiceStatus && needsCatchUp(input.startDate, input.today);
}

export interface RecoverableInvoice {
	id: string;
	status: string | null;
	metadata: { lesson_agreement_id?: string; kind?: string; month?: string; to_month?: string } | null;
}

export function matchesFirstInvoice(
	invoice: RecoverableInvoice,
	target: {
		agreementId: string;
		kind: string;
		month: string;
	},
): boolean {
	return (
		invoice.metadata?.lesson_agreement_id === target.agreementId &&
		invoice.metadata.kind === target.kind &&
		invoice.metadata.month === target.month
	);
}

/** Durable Stripe adoption, independent of the 24-hour idempotency window. */
export async function findRecordedFirstInvoice<T extends RecoverableInvoice>(
	invoices: AsyncIterable<T>,
	target: { agreementId: string; month: string },
): Promise<T | null> {
	let found: T | null = null;
	for await (const invoice of invoices) {
		if (
			!['first_month', 'catch_up'].includes(invoice.metadata?.kind ?? '') ||
			invoice.metadata?.lesson_agreement_id !== target.agreementId ||
			invoice.metadata.month !== target.month
		)
			continue;
		if (found) throw new Error('Meerdere eerste facturen gevonden; controleer deze overeenkomst');
		if (invoice.status === 'void' || invoice.status === 'uncollectible')
			throw new Error('De eerste factuur vereist controle; er wordt geen nieuwe factuur gemaakt');
		found = invoice;
	}
	return found;
}

export async function recoverFirstInvoice<T extends RecoverableInvoice>(input: {
	invoices: AsyncIterable<T>;
	target: { agreementId: string; kind: string; month: string };
	create: () => Promise<T>;
	record: (invoice: T) => Promise<void>;
	completeDraft: (invoice: T) => Promise<void>;
}): Promise<string> {
	let adopted: T | undefined;
	for await (const invoice of input.invoices) {
		if (!matchesFirstInvoice(invoice, input.target)) continue;
		if (adopted) throw new Error('Meerdere eerste facturen gevonden; controleer deze overeenkomst');
		adopted = invoice;
	}
	if (adopted?.status === 'void' || adopted?.status === 'uncollectible') {
		throw new Error('De eerste factuur vereist controle; er wordt geen nieuwe factuur gemaakt');
	}
	const invoice = adopted ?? (await input.create());
	await input.record(invoice);
	if (invoice.status === 'draft') await input.completeDraft(invoice);
	return invoice.id;
}
