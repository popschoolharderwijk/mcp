import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createEmptyIdMap, type MongoIdMap } from './idMapHelpers';

export async function loadIdMap(path: string): Promise<MongoIdMap> {
	const file = Bun.file(path);
	if (!(await file.exists())) {
		return createEmptyIdMap();
	}
	const parsed = (await file.json()) as unknown;
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`Invalid id-map JSON at ${path}: expected object`);
	}
	return parsed as MongoIdMap;
}

export async function saveIdMap(path: string, map: MongoIdMap): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await Bun.write(path, `${JSON.stringify(map, null, 2)}\n`);
}
