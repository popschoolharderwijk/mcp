import type { ScheduleFrequencyEntry } from '../courses/types';
import { agreementDocPassesCutoff } from './agreementCutoffHelpers';
import { peekAgreementEndDateForCutoff } from './agreementEndDateHelpers';
import type { ImportSettings } from './importSettingsHelpers';
import { asOptionalString } from './mapPersonFieldHelpers';
import { extractMongoOid } from './parseMongoExportHelpers';
import { buildPersonDisplayNameByOid } from './personDisplayNameHelpers';
import {
	createEmptyReport,
	formatImportReportIssueSections,
	type ImportReportIssue,
	type ImportReportLogSections,
} from './reportHelpers';

export type CutoffRemovedAgreement = {
	oid: string;
	label: string;
};

export type CutoffRemovedStudent = {
	oid: string;
	label: string;
};

export type ImportCutoffRemovals = {
	agreements: CutoffRemovedAgreement[];
	students: CutoffRemovedStudent[];
};

function compareByLabelThenOid(a: { label: string; oid: string }, b: { label: string; oid: string }): number {
	const byLabel = a.label.localeCompare(b.label);
	if (byLabel !== 0) return byLabel;
	return a.oid.localeCompare(b.oid);
}

function studentSkipLabel(
	record: Record<string, unknown>,
	oid: string,
	namesByOid: ReadonlyMap<string, string>,
): string {
	const email = asOptionalString(record.email)?.trim();
	if (email != null && email.length > 0) return email;
	return namesByOid.get(oid) ?? oid;
}

function agreementNumberLabel(record: Record<string, unknown>, oid: string): string {
	const agreementNumber = asOptionalString(record.agreementnumber)?.trim();
	return agreementNumber != null && agreementNumber.length > 0 ? agreementNumber : oid;
}

/** One dropped agreement row, or null when the doc is kept / not readable. */
function droppedAgreementFromDoc(
	doc: unknown,
	settings: ImportSettings,
	scheduleFrequencyMap: ReadonlyMap<string, ScheduleFrequencyEntry>,
): CutoffRemovedAgreement | null {
	if (agreementDocPassesCutoff(doc, settings, scheduleFrequencyMap)) return null;
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return null;
	const record = doc as Record<string, unknown>;
	const oid = extractMongoOid(record._id);
	if (!oid) return null;

	const peeked = peekAgreementEndDateForCutoff(doc, scheduleFrequencyMap);
	if (!peeked.ok || peeked.endDate == null) return null;

	return { oid, label: agreementNumberLabel(record, oid) };
}

/** Agreements that fail `minAgreementEndDate` (open ends and unreadable docs are kept). */
function collectAgreementsDroppedByMinEndDate(
	agreementDocs: readonly unknown[],
	settings: ImportSettings,
	scheduleFrequencyMap: ReadonlyMap<string, ScheduleFrequencyEntry>,
): CutoffRemovedAgreement[] {
	if (settings.minAgreementEndDate == null) return [];

	const removed: CutoffRemovedAgreement[] = [];
	for (const doc of agreementDocs) {
		const row = droppedAgreementFromDoc(doc, settings, scheduleFrequencyMap);
		if (row != null) removed.push(row);
	}
	return removed.sort(compareByLabelThenOid);
}

/** Students whose Mongo oid is not on the kept-agreement allowlist. */
function collectStudentsDroppedByAllowlist(
	studentDocs: readonly unknown[],
	allowlist: ReadonlySet<string>,
	namesByOid: ReadonlyMap<string, string>,
): CutoffRemovedStudent[] {
	const removed: CutoffRemovedStudent[] = [];
	for (const doc of studentDocs) {
		if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) continue;
		const record = doc as Record<string, unknown>;
		const oid = extractMongoOid(record._id);
		if (!oid || allowlist.has(oid)) continue;
		removed.push({
			oid,
			label: studentSkipLabel(record, oid, namesByOid),
		});
	}
	return removed.sort(compareByLabelThenOid);
}

export function buildImportCutoffRemovals(params: {
	settings: ImportSettings;
	agreementDocs: readonly unknown[];
	studentDocs: readonly unknown[];
	scheduleFrequencyMap: ReadonlyMap<string, ScheduleFrequencyEntry>;
	keptStudentOids: ReadonlySet<string> | null;
}): ImportCutoffRemovals {
	const namesByOid = buildPersonDisplayNameByOid([...params.studentDocs]);
	const agreements = collectAgreementsDroppedByMinEndDate(
		params.agreementDocs,
		params.settings,
		params.scheduleFrequencyMap,
	);
	const students =
		params.settings.removeOutdatedStudents && params.keptStudentOids != null
			? collectStudentsDroppedByAllowlist(params.studentDocs, params.keptStudentOids, namesByOid)
			: [];
	return { agreements, students };
}

function formatSkippedReason(label: string, oid: string): string {
	return `skipped ${label} (${oid})`;
}

/** Info-log sections listing cutoff removals (agreements + students). */
export function formatImportCutoffRemovalLog(
	settings: ImportSettings,
	removals: ImportCutoffRemovals,
): ImportReportLogSections | null {
	const infos: ImportReportIssue[] = [];
	if (settings.minAgreementEndDate != null) {
		for (const row of removals.agreements) {
			infos.push({ oid: null, reason: formatSkippedReason(row.label, row.oid) });
		}
	}
	if (settings.removeOutdatedStudents) {
		for (const row of removals.students) {
			infos.push({ oid: null, reason: formatSkippedReason(row.label, row.oid) });
		}
	}
	if (infos.length === 0) return null;
	const report = createEmptyReport();
	report.infos = infos;
	return formatImportReportIssueSections(report);
}
