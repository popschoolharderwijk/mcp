function deepEqualArrays(a: unknown[], b: unknown[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (!deepEqual(a[i], b[i])) return false;
	}
	return true;
}

function deepEqualObjects(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	if (aKeys.length !== bKeys.length) return false;
	for (const key of aKeys) {
		if (!bKeys.includes(key)) return false;
		if (!deepEqual(a[key], b[key])) return false;
	}
	return true;
}

function deepEqualEarlyResult(a: unknown, b: unknown): boolean | null {
	if (a === b) return true;
	if (a === null || b === null || a === undefined || b === undefined) return a === b;
	if (typeof a !== typeof b || typeof a !== 'object') return false;
	return null;
}

export function deepEqual(a: unknown, b: unknown): boolean {
	const early = deepEqualEarlyResult(a, b);
	if (early !== null) return early;
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (Array.isArray(a) && Array.isArray(b)) return deepEqualArrays(a, b);
	return deepEqualObjects(a as Record<string, unknown>, b as Record<string, unknown>);
}
