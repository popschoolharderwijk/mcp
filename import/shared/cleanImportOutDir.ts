import { mkdir, rm } from 'node:fs/promises';

/** Remove `outDir` entirely and recreate it empty. */
export async function cleanImportOutDir(outDir: string): Promise<void> {
	await rm(outDir, { recursive: true, force: true });
	await mkdir(outDir, { recursive: true });
}
