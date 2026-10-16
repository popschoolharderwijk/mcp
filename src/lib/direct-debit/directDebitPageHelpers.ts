import type { DirectDebitBatch } from '@/lib/direct-debit/types';

export function computeDefaultCollectionDate(defaultCollectionDay: number, now = new Date()): string {
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	return `${year}-${String(month).padStart(2, '0')}-${String(defaultCollectionDay).padStart(2, '0')}`;
}

export function buildDirectDebitBatchNumber(collectionDate: string): string {
	const yyyymm = collectionDate.slice(0, 7).replace('-', '');
	const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `INC-${yyyymm}-${suffix}`;
}

export function mapDirectDebitBatchRows(data: unknown): DirectDebitBatch[] {
	return (data ?? []) as DirectDebitBatch[];
}
