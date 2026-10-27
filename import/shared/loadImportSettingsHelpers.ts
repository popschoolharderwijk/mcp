import { join } from 'node:path';
import { IMPORT_SETTINGS_FILE } from '../config';
import { buildScheduleFrequencyMap } from '../courses/parseScheduleFrequenciesHelpers';
import { collectStudentOidsWithKeptAgreements } from './agreementCutoffHelpers';
import { resetImportRuntimeSettings, setImportSettings, setStudentOidAllowlist } from './importRuntimeSettingsHelpers';
import { DEFAULT_IMPORT_SETTINGS, type ImportSettings, parseImportSettings } from './importSettingsHelpers';
import { parseMongoExportText } from './parseMongoExportHelpers';

export type ApplyImportSettingsResult =
	| { ok: true; settings: ImportSettings; settingsPath: string; missingFile: boolean }
	| { ok: false; error: string };

/** Read and validate `<sourceDir>/settings.json`, or defaults when the file is absent. */
async function loadImportSettingsFile(
	settingsPath: string,
): Promise<{ ok: true; value: ImportSettings; missingFile: boolean } | { ok: false; error: string }> {
	const file = Bun.file(settingsPath);
	if (!(await file.exists())) {
		return { ok: true, value: { ...DEFAULT_IMPORT_SETTINGS }, missingFile: true };
	}

	let raw: unknown;
	try {
		raw = await file.json();
	} catch {
		return { ok: false, error: `Invalid JSON in ${settingsPath}` };
	}

	const parsed = parseImportSettings(raw);
	if (!parsed.ok) {
		return { ok: false, error: `${settingsPath}: ${parsed.error}` };
	}
	return { ok: true, value: parsed.value, missingFile: false };
}

async function readOptionalSourceText(
	path: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
	const file = Bun.file(path);
	if (!(await file.exists())) {
		return { ok: false, error: `Input not found: ${path}` };
	}
	return { ok: true, text: await file.text() };
}

/**
 * Load settings from the source dir, set runtime state, and optionally build the student allowlist.
 */
export async function applyImportSettingsFromSource(sourceDir: string): Promise<ApplyImportSettingsResult> {
	resetImportRuntimeSettings();
	const settingsPath = join(sourceDir, IMPORT_SETTINGS_FILE);
	const loaded = await loadImportSettingsFile(settingsPath);
	if (!loaded.ok) return loaded;

	setImportSettings(loaded.value);

	if (!loaded.value.removeOutdatedStudents) {
		setStudentOidAllowlist(null);
		return {
			ok: true,
			settings: loaded.value,
			settingsPath,
			missingFile: loaded.missingFile,
		};
	}

	const agreementsPath = join(sourceDir, 'agreements_course.jsonl');
	const schedulePath = join(sourceDir, 'schedule_frequencies.jsonl');
	const agreementsText = await readOptionalSourceText(agreementsPath);
	if (!agreementsText.ok) return agreementsText;
	const scheduleText = await readOptionalSourceText(schedulePath);
	if (!scheduleText.ok) return scheduleText;

	const agreementDocs = parseMongoExportText(agreementsText.text, agreementsPath);
	const scheduleMap = buildScheduleFrequencyMap(parseMongoExportText(scheduleText.text, schedulePath));
	const studentOids = collectStudentOidsWithKeptAgreements(agreementDocs, loaded.value, scheduleMap);
	setStudentOidAllowlist(studentOids);

	return {
		ok: true,
		settings: loaded.value,
		settingsPath,
		missingFile: loaded.missingFile,
	};
}
