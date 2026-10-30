import type { ImportConverter, MappedImportRow } from '../shared/converterTypes';
import { buildProfilesBatch } from './buildProfilesBatchHelpers';
import { buildProfilesSql } from './buildProfilesSqlHelpers';
import type { ProfileSqlRow } from './types';

/** Teachers + students sources → auth.users + public.profiles only (roles are separate SQL). */
export const profilesConverter: ImportConverter<MappedImportRow, ProfileSqlRow, 'profiles'> = {
	name: 'profiles',
	entityType: 'profile',
	mappedKeys: new Set(),
	ignoredKeys: new Set(),
	buildBatch(primaryDocs, extraFileDocs, idMap, createId) {
		return buildProfilesBatch(primaryDocs, extraFileDocs['students.jsonl'], idMap, createId);
	},
	mapDoc() {
		return { ok: false, oid: null, reason: 'profiles converter uses buildBatch' };
	},
	warningsForRow: () => [],
	assignId: (row) => row as unknown as ProfileSqlRow,
	buildSql: buildProfilesSql,
};
