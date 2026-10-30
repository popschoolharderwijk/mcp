import { afterEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanImportOutDir } from './cleanImportOutDir';

describe('cleanImportOutDir', () => {
	const dirs: string[] = [];

	afterEach(async () => {
		await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
	});

	it('removes existing files and leaves an empty directory', async () => {
		const outDir = await mkdtemp(join(tmpdir(), 'import-clean-'));
		dirs.push(outDir);
		await writeFile(join(outDir, 'stale.sql'), 'old');
		await mkdir(join(outDir, 'nested'));
		await writeFile(join(outDir, 'nested', 'extra.txt'), 'x');

		await cleanImportOutDir(outDir);

		expect(await readdir(outDir)).toEqual([]);
	});

	it('creates the out directory when it does not exist', async () => {
		const parent = await mkdtemp(join(tmpdir(), 'import-clean-missing-'));
		dirs.push(parent);
		const outDir = join(parent, 'out');

		await cleanImportOutDir(outDir);

		expect(await readdir(outDir)).toEqual([]);
	});
});
