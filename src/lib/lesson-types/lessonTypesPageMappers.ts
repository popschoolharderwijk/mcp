export function buildOptionsCountMap(rows: Array<{ lesson_type_id: string }>): Map<string, number> {
	const countMap = new Map<string, number>();
	for (const row of rows) {
		countMap.set(row.lesson_type_id, (countMap.get(row.lesson_type_id) ?? 0) + 1);
	}
	return countMap;
}
