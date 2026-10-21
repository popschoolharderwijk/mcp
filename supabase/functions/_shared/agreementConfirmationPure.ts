import { formatInviteCents, formatInviteDate } from './directDebitInvitePure.ts';
import type { PaymentPreview } from './paymentLinkPure.ts';

export function escapeConfirmationHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
	);
}

/** Amounts are already computed by SQL; this function only formats them. */
export function buildAgreementPaymentVars(input: {
	paymentMethod: string;
	preview: PaymentPreview;
	minimumTermEnd: string | null;
	link: string;
}): Record<string, string> {
	const { preview } = input;
	const amount = preview.monthly
		? `${formatInviteCents(preview.monthly.amountCents)} (${preview.monthly.btwRate === 21 ? 'inclusief 21% btw' : 'vrijgesteld van btw'})`
		: '';
	const first = preview.firstMonth ? formatInviteCents(preview.firstMonth.amountCents) : '';
	const catchUp = preview.catchUp ? formatInviteCents(preview.catchUp.amountCents) : '';
	const term = formatInviteDate(input.minimumTermEnd);
	const automatic = input.paymentMethod === 'stripe';
	const extra = catchUp
		? `<p>De gemiste maanden worden samen op één inhaalfactuur van ${catchUp} direct afgeschreven na je machtiging.</p>`
		: first
			? `<p>De eerste maand betaal je naar rato: ${first}.</p>`
			: '';
	const block = automatic
		? `<p>Je maandbedrag is ${amount}. In augustus schrijven we niets af.</p>${extra}<p>Je eerste verbintenis loopt tot en met ${term}.</p><p><a href="${escapeConfirmationHtml(input.link)}" style="background-color:#c4ab7c;color:#000;padding:12px 20px;text-decoration:none;display:inline-block;border-radius:4px;">Machtiging afgeven</a></p>`
		: '<p>Je ontvangt maandelijks een factuur van ons.</p>';
	return {
		bedrag: amount,
		eerste_maand_bedrag: first,
		inhaal_bedrag: catchUp,
		minimale_looptijd_tot: term,
		link: automatic ? input.link : '',
		betaalblok: block,
		betaalmethode: automatic ? 'Machtiging via iDEAL' : 'Op factuur',
	};
}

export function wasTemplateEmailDelivered(response: unknown): boolean {
	if (!response || typeof response !== 'object') return false;
	const payload = response as { ok?: unknown; skipped?: unknown; error?: unknown };
	return payload.ok === true && payload.skipped !== true && !payload.error;
}
