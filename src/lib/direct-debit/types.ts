export type MandateStatus = 'pending' | 'active' | 'revoked';
export type SequenceType = 'FRST' | 'RCUR' | 'OOFF' | 'FNAL';
export type BatchStatus = 'draft' | 'approved' | 'submitted' | 'closed' | 'cancelled';
export type BatchItemStatus = 'pending' | 'submitted' | 'accepted' | 'rejected' | 'reversed';
export type BatchItemKind = 'subscription' | 'correction' | 'manual';

export interface DirectDebitBatch {
	id: string;
	batch_number: string;
	status: BatchStatus;
	collection_date: string;
	message_id: string | null;
	xml_sha256: string | null;
	xml_storage_path: string | null;
	total_amount_cents: number;
	item_count: number;
	approved_by: string | null;
	approved_at: string | null;
	submitted_at: string | null;
	closed_at: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface DirectDebitBatchItem {
	id: string;
	batch_id: string;
	lesson_agreement_id: string | null;
	mandate_id: string;
	student_user_id: string;
	end_to_end_id: string;
	amount_cents: number;
	currency: string;
	remittance_info: string;
	kind: BatchItemKind;
	sequence_type: SequenceType;
	status: BatchItemStatus;
	reason_code: string | null;
	status_updated_at: string | null;
	created_at: string;
	updated_at: string;
}

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
	draft: 'Concept',
	approved: 'Goedgekeurd',
	submitted: 'Aangeboden',
	closed: 'Afgerond',
	cancelled: 'Geannuleerd',
};

export const ITEM_STATUS_LABELS: Record<BatchItemStatus, string> = {
	pending: 'Concept',
	submitted: 'Aangeboden',
	accepted: 'Geslaagd',
	rejected: 'Afgewezen',
	reversed: 'Stornering',
};

export const MANDATE_STATUS_LABELS: Record<MandateStatus, string> = {
	pending: 'In afwachting',
	active: 'Actief',
	revoked: 'Ingetrokken',
};

export function formatCentsEUR(cents: number): string {
	return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
