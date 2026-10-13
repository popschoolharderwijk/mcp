export interface Body {
	batch_id?: string;
}

export interface SettingsRow {
	sepa_creditor_name: string | null;
	sepa_creditor_iban: string | null;
	sepa_creditor_bic: string | null;
	sepa_creditor_id: string | null;
}

export interface BatchRow {
	id: string;
	batch_number: string;
	status: string;
	collection_date: string;
	message_id: string | null;
	xml_storage_path: string | null;
}

export interface ItemRow {
	id: string;
	lesson_agreement_id?: string | null;
	mandate_id: string;
	amount_cents: number;
	currency: string;
	end_to_end_id: string;
	remittance_info: string;
	sequence_type: 'FRST' | 'RCUR' | 'OOFF' | 'FNAL';
	sepa_mandates: {
		mandate_reference: string;
		iban: string;
		bic: string | null;
		account_holder: string;
		signed_at: string | null;
	} | null;
}

export interface SepaXmlContext {
	settings: SettingsRow & {
		sepa_creditor_name: string;
		sepa_creditor_iban: string;
		sepa_creditor_id: string;
	};
	batch: BatchRow;
	items: ItemRow[];
}
