import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadIdMap, resetIdMap, saveIdMap } from './idMapFile';

describe('idMapFile', () => {
	let dir: string | undefined;

	afterEach(async () => {
		if (dir) {
			await rm(dir, { recursive: true, force: true });
			dir = undefined;
		}
	});

	it('resetIdMap discards previous mappings so the next load is empty', async () => {
		dir = await mkdtemp(join(tmpdir(), 'import-id-map-'));
		const mapPath = join(dir, 'out', 'id-map.json');

		await saveIdMap(mapPath, { lesson_type: { 'mongo-a': 'uuid-shared' } });
		await resetIdMap(mapPath);

		expect(await loadIdMap(mapPath)).toEqual({});
	});
});
