import type { ScheduleFrequencyEntry } from '../courses/types';
import { peekAgreementEndDateForCutoff } from './agreementEndDateHelpers';
import { type ImportSettings, passesMinAgreementEndDate } from './importSettingsHelpers';
import { extractMongoOid } from './parseMongoExportHelpers';

/** Whether a Mongo agreement doc should be imported under the current settings cutoff. */
export function agreementDocPassesCutoff(
	doc: unknown,
	settings: ImportSettings,
	scheduleFrequencyMap: ReadonlyMap<string, ScheduleFrequencyEntry>,
): boolean {
	if (settings.minAgreementEndDate == null) return true;
	const peeked = peekAgreementEndDateForCutoff(doc, scheduleFrequencyMap);
	if (!peeked.ok) return true;
	return passesMinAgreementEndDate(peeked.endDate, settings.minAgreementEndDate);
}

/**
 * Student Mongo oids that appear on at least one kept agreement.
 * When `minAgreementEndDate` is set, only agreements that pass the cutoff count.
 */
export function collectStudentOidsWithKeptAgreements(
	agreementDocs: readonly unknown[],
	settings: ImportSettings,
	scheduleFrequencyMap: ReadonlyMap<string, ScheduleFrequencyEntry>,
): Set<string> {
	const oids = new Set<string>();
	for (const doc of agreementDocs) {
		if (!agreementDocPassesCutoff(doc, settings, scheduleFrequencyMap)) continue;
		if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) continue;
		const studentOid = extractMongoOid((doc as Record<string, unknown>).student);
		if (studentOid) oids.add(studentOid);
	}
	return oids;
}
