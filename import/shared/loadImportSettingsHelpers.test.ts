import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadImportSettingsFile } from './loadImportSettingsHelpers';

describe('loadImportSettingsFile', () => {
	it('fails when the settings file is missing', async () => {
		const missingPath = join(tmpdir(), 'mcp-import-settings-missing', 'settings.json');
		expect(await loadImportSettingsFile(missingPath)).toEqual({
			ok: false,
			error: `Settings file not found: ${missingPath}`,
		});
	});
});
