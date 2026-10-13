import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Truncate (or create) the import log so a new CLI run starts clean. */
export async function resetImportLog(logPath: string): Promise<void> {
	await mkdir(dirname(logPath), { recursive: true });
	await Bun.write(logPath, '');
}

/** Append a converter's issue section to the import log. */
export async function appendImportLog(logPath: string, section: string): Promise<void> {
	await mkdir(dirname(logPath), { recursive: true });
	const existing = (await Bun.file(logPath).exists()) ? await Bun.file(logPath).text() : '';
	await Bun.write(logPath, `${existing}${section}`);
}
