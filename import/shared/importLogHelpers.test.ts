import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resetImportLogs, resolveImportLogDir, writeImportSectionLogs } from './importLogHelpers';

describe('importLogHelpers', () => {
	const dirs: string[] = [];

	afterEach(async () => {
		await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
	});

	it('writes per-section severity files and clears them on reset', async () => {
		const outDir = await mkdtemp(join(tmpdir(), 'import-log-'));
		dirs.push(outDir);
		const logDir = resolveImportLogDir(outDir);

		await writeImportSectionLogs(logDir, 'courses', {
			error: 'ERROR oid-1: Missing name\n',
			warning: 'WARN oid-2: Odd schedule\n',
			info: null,
		});
		await writeImportSectionLogs(logDir, 'students', {
			error: null,
			warning: 'WARN oid-3: Phone skipped\n',
			info: 'INFO: skipped student\n',
		});

		expect((await readdir(logDir)).toSorted()).toEqual([
			'courses.error.log',
			'courses.warning.log',
			'students.info.log',
			'students.warning.log',
		]);
		expect(await Bun.file(join(logDir, 'courses.error.log')).text()).toBe('ERROR oid-1: Missing name\n');
		expect(await Bun.file(join(logDir, 'students.warning.log')).text()).toBe('WARN oid-3: Phone skipped\n');

		await resetImportLogs(logDir);
		expect(await readdir(logDir)).toEqual([]);
	});
});
