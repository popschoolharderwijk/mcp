/** Collapse duplicate user ids; `mergeDuplicate` picks field values when the same user appears twice. */
export function dedupeImportRowsByUserId<TRow extends { userId: string }>(
	rows: TRow[],
	mergeDuplicate: (existing: TRow, duplicate: TRow) => TRow,
): TRow[] {
	const byUserId = new Map<string, TRow>();
	for (const row of rows) {
		const existing = byUserId.get(row.userId);
		if (!existing) {
			byUserId.set(row.userId, row);
			continue;
		}
		byUserId.set(row.userId, mergeDuplicate(existing, row));
	}
	return [...byUserId.values()];
}
