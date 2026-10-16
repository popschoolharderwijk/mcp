import { createEmptyIdMap, type MongoIdMap } from './idMapHelpers';

/** Validate parsed JSON as an id-map object; throw on invalid shape. */
export function parseIdMapJson(parsed: unknown, path: string): MongoIdMap {
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`Invalid id-map JSON at ${path}: expected object`);
	}
	return parsed as MongoIdMap;
}

export function idMapFromMissingFile(): MongoIdMap {
	return createEmptyIdMap();
}
