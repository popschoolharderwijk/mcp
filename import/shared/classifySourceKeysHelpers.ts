export type SourceKeyClassification = {
	skippedKeys: string[];
	ignoredKeys: string[];
};

/** Split source object keys into unexpected (skipped) vs intentionally ignored. */
export function classifySourceKeys(
	doc: object,
	mappedKeys: ReadonlySet<string>,
	ignoredKeys: ReadonlySet<string>,
): SourceKeyClassification {
	const skipped: string[] = [];
	const ignored: string[] = [];

	for (const key of Object.keys(doc).sort((a, b) => a.localeCompare(b))) {
		if (mappedKeys.has(key)) continue;
		if (ignoredKeys.has(key)) {
			ignored.push(key);
			continue;
		}
		skipped.push(key);
	}

	return { skippedKeys: skipped, ignoredKeys: ignored };
}
