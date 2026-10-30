import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseIdMapJson } from './idMapFileHelpers';
import { createEmptyIdMap, type MongoIdMap } from './idMapHelpers';

export async function loadIdMap(path: string): Promise<MongoIdMap> {
	const file = Bun.file(path);
	if (!(await file.exists())) {
		return createEmptyIdMap();
	}
	return parseIdMapJson(await file.json(), path);
}

export async function saveIdMap(path: string, map: MongoIdMap): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await Bun.write(path, `${JSON.stringify(map, null, 2)}\n`);
}

/** Discard a previous run's id-map so a full CLI import starts with fresh UUIDs. */
export async function resetIdMap(path: string): Promise<void> {
	await saveIdMap(path, createEmptyIdMap());
}
