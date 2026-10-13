import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendImportLog, resetImportLog } from './importLogHelpers';

describe('importLogHelpers', () => {
	let dir: string | undefined;

	afterEach(async () => {
		if (dir) {
			await rm(dir, { recursive: true, force: true });
			dir = undefined;
		}
	});

	it('overwrites existing content on reset and appends sections', async () => {
		dir = await mkdtemp(join(tmpdir(), 'import-log-'));
		const logPath = join(dir, 'out', 'import.log');

		await resetImportLog(logPath);
		await appendImportLog(logPath, '=== teachers ===\nold\n');
		await resetImportLog(logPath);
		await appendImportLog(logPath, '=== students ===\nERROR oid: Missing email\n');

		expect(await Bun.file(logPath).text()).toBe('=== students ===\nERROR oid: Missing email\n');
	});
});
