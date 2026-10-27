import { join } from 'node:path';
import { IMPORT_SETTINGS_FILE } from '../config';
import { buildScheduleFrequencyMap } from '../courses/parseScheduleFrequenciesHelpers';
import { collectStudentOidsWithKeptAgreements } from './agreementCutoffHelpers';
import { buildImportCutoffRemovals, type ImportCutoffRemovals } from './importCutoffRemovalHelpers';
import { resetImportRuntimeSettings, setImportSettings, setStudentOidAllowlist } from './importRuntimeSettingsHelpers';
import { type ImportSettings, parseImportSettings } from './importSettingsHelpers';
import { parseMongoExportText } from './parseMongoExportHelpers';

export type ApplyImportSettingsResult =
	| { ok: true; settings: ImportSettings; settingsPath: string; cutoffRemovals: ImportCutoffRemovals }
	| { ok: false; error: string };

/** Read and validate settings JSON at path. */
export async function loadImportSettingsFile(
	settingsPath: string,
): Promise<{ ok: true; value: ImportSettings } | { ok: false; error: string }> {
	const file = Bun.file(settingsPath);
	if (!(await file.exists())) {
		return { ok: false, error: `Settings file not found: ${settingsPath}` };
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
	return { ok: true, value: parsed.value };
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

/** Absolute path to package `import/settings.json`. */
function resolveImportSettingsPath(): string {
	return join(import.meta.dir, '..', IMPORT_SETTINGS_FILE);
}

function emptyCutoffRemovals(): ImportCutoffRemovals {
	return { agreements: [], students: [] };
}

/**
 * Load `import/settings.json`, set runtime state, and optionally build the student allowlist from source dumps.
 * Also collects cutoff removals for a single import.log section.
 */
export async function applyImportSettingsFromSource(sourceDir: string): Promise<ApplyImportSettingsResult> {
	resetImportRuntimeSettings();
	const settingsPath = resolveImportSettingsPath();
	const loaded = await loadImportSettingsFile(settingsPath);
	if (!loaded.ok) return loaded;

	setImportSettings(loaded.value);

	const needsAgreementScan = loaded.value.minAgreementEndDate != null || loaded.value.removeOutdatedStudents;
	if (!needsAgreementScan) {
		setStudentOidAllowlist(null);
		return {
			ok: true,
			settings: loaded.value,
			settingsPath,
			cutoffRemovals: emptyCutoffRemovals(),
		};
	}

	const agreementsPath = join(sourceDir, 'agreements_course.jsonl');
	const schedulePath = join(sourceDir, 'schedule_frequencies.jsonl');
	const studentsPath = join(sourceDir, 'students.jsonl');
	const agreementsText = await readOptionalSourceText(agreementsPath);
	if (!agreementsText.ok) return agreementsText;
	const scheduleText = await readOptionalSourceText(schedulePath);
	if (!scheduleText.ok) return scheduleText;
	const studentsText = await readOptionalSourceText(studentsPath);
	if (!studentsText.ok) return studentsText;

	const agreementDocs = parseMongoExportText(agreementsText.text, agreementsPath);
	const scheduleMap = buildScheduleFrequencyMap(parseMongoExportText(scheduleText.text, schedulePath));
	const studentDocs = parseMongoExportText(studentsText.text, studentsPath);

	const keptStudentOids = loaded.value.removeOutdatedStudents
		? collectStudentOidsWithKeptAgreements(agreementDocs, loaded.value, scheduleMap)
		: null;
	setStudentOidAllowlist(keptStudentOids);

	const cutoffRemovals = buildImportCutoffRemovals({
		settings: loaded.value,
		agreementDocs,
		studentDocs,
		scheduleFrequencyMap: scheduleMap,
		keptStudentOids,
	});

	return {
		ok: true,
		settings: loaded.value,
		settingsPath,
		cutoffRemovals,
	};
}
