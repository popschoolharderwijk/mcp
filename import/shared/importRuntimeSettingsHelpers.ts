import { DEFAULT_IMPORT_SETTINGS, type ImportSettings } from './importSettingsHelpers';
import { extractMongoOid } from './parseMongoExportHelpers';

let importSettings: ImportSettings = { ...DEFAULT_IMPORT_SETTINGS };
/** When non-null, only these student Mongo oids are imported (profiles + students). */
let studentOidAllowlist: Set<string> | null = null;

export function setImportSettings(settings: ImportSettings): void {
	importSettings = settings;
}

export function getImportSettings(): ImportSettings {
	return importSettings;
}

export function setStudentOidAllowlist(oids: Set<string> | null): void {
	studentOidAllowlist = oids;
}

/** Reset module state between tests / CLI runs. */
export function resetImportRuntimeSettings(): void {
	importSettings = { ...DEFAULT_IMPORT_SETTINGS };
	studentOidAllowlist = null;
}

export function studentDocPassesAllowlist(doc: unknown): boolean {
	const allowlist = studentOidAllowlist;
	if (allowlist == null) return true;
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return false;
	const oid = extractMongoOid((doc as Record<string, unknown>)._id);
	return oid != null && allowlist.has(oid);
}
