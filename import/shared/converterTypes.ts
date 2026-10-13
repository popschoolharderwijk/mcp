import type { ImportConverterName } from '../config';

export type MappedImportRow = {
	mongoOid: string;
};

export type MapDocResult<TRow extends MappedImportRow> =
	| { ok: true; row: TRow }
	| { ok: false; oid: string | null; reason: string };

/** One Mongo → SQL converter. Register instances in `import/converters.ts`. */
export type ImportConverter<TRow extends MappedImportRow = MappedImportRow, TSqlRow = unknown> = {
	name: ImportConverterName;
	entityType: string;
	mappedKeys: ReadonlySet<string>;
	ignoredKeys: ReadonlySet<string>;
	mapDoc: (doc: unknown) => MapDocResult<TRow>;
	warningsForRow: (row: TRow) => string[];
	assignId: (row: TRow, id: string) => TSqlRow;
	buildSql: (rows: TSqlRow[]) => string;
};
