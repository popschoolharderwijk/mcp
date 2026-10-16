interface InvoiceSearchProfile {
	first_name: string | null;
	last_name: string | null;
	email: string;
}

export interface InvoiceSearchRow {
	invoice_number: string;
	profiles?: InvoiceSearchProfile | null;
}

export function invoiceSearchHaystack(row: InvoiceSearchRow): string {
	const profile = row.profiles;
	const name = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`;
	return `${row.invoice_number} ${name} ${profile?.email ?? ''}`;
}

export function matchesInvoiceSearch(row: InvoiceSearchRow, search: string): boolean {
	if (!search) return true;
	return invoiceSearchHaystack(row).toLowerCase().includes(search.toLowerCase());
}
