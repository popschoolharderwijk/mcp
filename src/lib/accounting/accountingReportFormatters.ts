import { formatAdultVatBadgeLabel } from '@/lib/settings/vatLabelHelpers';

export type AccountingAgeBadgeVariant = 'secondary' | 'outline' | 'default';

export interface AccountingAgeBadge {
	label: string;
	variant: AccountingAgeBadgeVariant;
}

export function getAccountingAgeBadge(ageCategory: string, standardRatePercent: number): AccountingAgeBadge {
	if (ageCategory === 'youth') return { label: 'Jongeren (vrijgesteld)', variant: 'secondary' };
	if (ageCategory === 'adult') {
		return { label: formatAdultVatBadgeLabel(standardRatePercent), variant: 'outline' };
	}
	if (ageCategory === 'unknown') return { label: 'Onbekende leeftijd', variant: 'default' };
	return { label: ageCategory, variant: 'default' };
}

export function formatAccountingInvoiceDate(periodStart: string): string {
	return periodStart.slice(0, 10);
}

export function getAccountingStatusBadgeVariant(status: string): 'secondary' | 'outline' {
	return status === 'paid' ? 'secondary' : 'outline';
}
