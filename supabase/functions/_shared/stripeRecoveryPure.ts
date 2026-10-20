/**
 * Self-healing helpers for stored Stripe ids (tax rates, portal configuration, products,
 * prices, customers). Stored ids can belong to another Stripe account after the secret key
 * changed; Stripe then answers `resource_missing`. No Stripe or DB access here.
 */

/** Shown to customers instead of raw Stripe errors. */
export const CUSTOMER_DIRECT_DEBIT_ERROR =
	'Er ging iets mis bij het afronden van je machtiging. Je hoeft niets opnieuw te doen; Popschool neemt contact met je op.';

export type MissingStripeResource = 'tax_rate' | 'price' | 'product' | 'customer' | 'portal' | 'other';

function readRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function readCode(err: unknown): string | null {
	const rec = readRecord(err);
	if (!rec) return null;
	if (typeof rec.code === 'string') return rec.code;
	const raw = readRecord(rec.raw);
	return typeof raw?.code === 'string' ? raw.code : null;
}

function readMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	const rec = readRecord(err);
	return typeof rec?.message === 'string' ? rec.message : '';
}

/** True when Stripe says the referenced object does not exist (in this account). */
export function isStripeResourceMissing(err: unknown): boolean {
	return readCode(err) === 'resource_missing' || /^No such /i.test(readMessage(err));
}

/** Which kind of stored id is missing, or null when the error is something else. */
export function missingStripeResource(err: unknown): MissingStripeResource | null {
	if (!isStripeResourceMissing(err)) return null;
	const rec = readRecord(err);
	const text = `${typeof rec?.param === 'string' ? rec.param : ''} ${readMessage(err)}`.toLowerCase();
	if (text.includes('tax rate') || text.includes('tax_rate') || /\btxr_/.test(text)) return 'tax_rate';
	if (text.includes('price')) return 'price';
	if (text.includes('product')) return 'product';
	if (text.includes('customer') || /\bcus_/.test(text)) return 'customer';
	if (text.includes('configuration') || /\bbpc_/.test(text)) return 'portal';
	return 'other';
}

const MISSING_MESSAGES: Record<MissingStripeResource, string> = {
	tax_rate: 'Btw-tarief bestaat niet in het huidige Stripe-account: synchroniseer eerst met Stripe',
	price: 'Prijs bestaat niet in het huidige Stripe-account: synchroniseer eerst met Stripe',
	product: 'Product bestaat niet in het huidige Stripe-account: synchroniseer eerst met Stripe',
	portal: 'Klantportaal bestaat niet in het huidige Stripe-account: synchroniseer eerst met Stripe',
	customer: 'Stripe-klant bestaat niet in het huidige Stripe-account: stuur een nieuwe betaaluitnodiging',
	other: 'Onderdeel bestaat niet in het huidige Stripe-account: synchroniseer eerst met Stripe',
};

/** Turns a missing-resource error into a clear admin message; other errors pass through. */
export function toScheduleError(err: unknown): unknown {
	const kind = missingStripeResource(err);
	return kind ? new Error(MISSING_MESSAGES[kind]) : err;
}

/**
 * Retrieves a stored Stripe object; returns null when it does not exist in this account
 * (so the caller can search or create it again). Other errors are rethrown.
 */
export async function retrieveIfExists<T>(id: string | null | undefined, retrieve: (id: string) => Promise<T>) {
	if (!id) return null;
	try {
		return await retrieve(id);
	} catch (err) {
		if (isStripeResourceMissing(err)) return null;
		throw err;
	}
}

/** A stored tax rate is reusable only when it exists and is still active. */
export function isUsableTaxRate(rate: { active: boolean } | null): boolean {
	return Boolean(rate?.active);
}

/** Catalog price rows whose Stripe id no longer exists on the current product. */
export function staleCatalogPriceIds(dbPriceIds: string[], currentStripePriceIds: string[]): string[] {
	const current = new Set(currentStripePriceIds);
	return dbPriceIds.filter((id) => !current.has(id));
}

/** Matches raw Stripe texts and ids that must never reach a customer. */
export function looksLikeRawStripeError(message: string): boolean {
	return (
		/^No such /i.test(message) ||
		/\b(txr|price|prod|cus|pm|seti|sub|sub_sched|cs|in|bpc|pi|src)_[A-Za-z0-9]{6,}/.test(message)
	);
}
