import type { ImportConverterName, ImportExtraDocs } from '../config';
import type { MongoIdMap } from './idMapHelpers';
import type { ImportReport } from './reportHelpers';

export type MappedImportRow = {
	mongoOid: string;
};

export type MapDocResult<TRow extends MappedImportRow> =
	| { ok: true; row: TRow }
	| { ok: false; oid: string | null; reason: string };

export type ImportBatch<TSqlRow> = {
	idMap: MongoIdMap;
	sqlRows: TSqlRow[];
	report: ImportReport;
};

/** One Mongo → SQL converter. Register instances in `import/converters.ts`. */
export type ImportConverter<
	TRow extends MappedImportRow = MappedImportRow,
	TSqlRow = unknown,
	TName extends ImportConverterName = ImportConverterName,
> = {
	name: TName;
	entityType: string;
	mappedKeys: ReadonlySet<string>;
	ignoredKeys: ReadonlySet<string>;
	/** Optional: load docs from source files after the primary. */
	prepareContext?(extraFileDocs: ImportExtraDocs<TName>): void;
	/**
	 * Optional multi-source batch builder (e.g. profiles from teachers + students).
	 * When set, `runImportConverter` uses this instead of `mapDoc` / `buildImportBatch`.
	 */
	buildBatch?(
		primaryDocs: unknown[],
		extraFileDocs: ImportExtraDocs<TName>,
		idMap: MongoIdMap,
		createId: () => string,
	): ImportBatch<TSqlRow>;
	mapDoc(doc: unknown, idMap: MongoIdMap): MapDocResult<TRow>;
	/** Called after `assignId` so warnings can mention concrete replacements (e.g. final emails). */
	warningsForRow(row: TSqlRow): string[];
	assignId(row: TRow, id: string): TSqlRow;
	buildSql(rows: TSqlRow[]): string;
};
