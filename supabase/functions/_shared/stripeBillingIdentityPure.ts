import { formatInviteName, resolveInviteRecipientName } from './directDebitInvitePure.ts';
import { resolveBillingRecipient } from './paymentLinkPure.ts';

export function resolveStripeBillingIdentity(input: {
	accountEmail: string | null | undefined;
	firstName?: string | null;
	lastName?: string | null;
	parentEmail?: string | null;
	parentName?: string | null;
	debtorName?: string | null;
	debtorSameAsStudent?: boolean | null;
}): { email: string; name: string } {
	const email = resolveBillingRecipient(input);
	if (!email) throw new Error('Geen e-mailadres bekend voor de betaler');
	return {
		email,
		name: resolveInviteRecipientName({ ...input, studentName: formatInviteName(input.firstName, input.lastName) }),
	};
}

export function stripeBillingIdentityChanged(
	current: { email?: string | null; name?: string | null },
	identity: { email: string; name: string },
): boolean {
	return current.email !== identity.email || current.name !== identity.name;
}
