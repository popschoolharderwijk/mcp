function unwrapMongoDate(dateVal: unknown): unknown {
	if (typeof dateVal === 'string') return dateVal;
	if (dateVal !== null && typeof dateVal === 'object' && '$numberLong' in (dateVal as object)) {
		const ms = Number((dateVal as { $numberLong: string }).$numberLong);
		return Number.isFinite(ms) ? new Date(ms).toISOString() : dateVal;
	}
	return dateVal;
}

function unwrapExtendedSingleton(record: Record<string, unknown>): unknown | undefined {
	const keys = Object.keys(record);
	if (keys.length !== 1) return undefined;
	if (keys[0] === '$oid' && typeof record.$oid === 'string') return record.$oid;
	if (keys[0] === '$date') return unwrapMongoDate(record.$date);
	return undefined;
}

function unwrapMongoObject(record: Record<string, unknown>): unknown {
	const singleton = unwrapExtendedSingleton(record);
	if (singleton !== undefined) return singleton;

	const out: Record<string, unknown> = {};
	for (const [key, nested] of Object.entries(record)) {
		out[key] = unwrapMongoExtendedJson(nested);
	}
	return out;
}

/** Unwrap Mongo extended JSON `{ "$oid": "…" }` / `{ "$date": "…" }` (and nested values). */
export function unwrapMongoExtendedJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(unwrapMongoExtendedJson);
	}
	if (value !== null && typeof value === 'object') {
		return unwrapMongoObject(value as Record<string, unknown>);
	}
	return value;
}

export function extractMongoOid(idField: unknown): string | null {
	const unwrapped = unwrapMongoExtendedJson(idField);
	if (typeof unwrapped === 'string' && unwrapped.length > 0) return unwrapped;
	return null;
}

/** Parse a `.json` (array or single object) or `.jsonl` file contents into documents. */
export function parseMongoExportText(text: string, fileNameHint?: string): unknown[] {
	const trimmed = text.replace(/^\uFEFF/, '').trim();
	if (!trimmed) return [];

	const preferJsonl =
		fileNameHint?.endsWith('.jsonl') === true || (trimmed.startsWith('{') && /\n\s*\{/.test(trimmed));

	if (preferJsonl) {
		return parseJsonl(trimmed);
	}

	const parsed = JSON.parse(trimmed) as unknown;
	if (Array.isArray(parsed)) {
		return parsed.map(unwrapMongoExtendedJson);
	}
	return [unwrapMongoExtendedJson(parsed)];
}

function parseJsonl(text: string): unknown[] {
	const docs: unknown[] = [];
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim();
		if (!line) continue;
		try {
			docs.push(unwrapMongoExtendedJson(JSON.parse(line)));
		} catch {
			throw new Error(`Invalid JSON on line ${i + 1}`);
		}
	}
	return docs;
}
