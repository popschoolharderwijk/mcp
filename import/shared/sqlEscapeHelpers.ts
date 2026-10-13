/** Escape a value as a SQL string literal, or NULL. */
export function sqlString(value: string | null | undefined): string {
	if (value == null) return 'NULL';
	return `'${value.replace(/'/g, "''")}'`;
}

export function sqlUuid(value: string): string {
	return `'${value.replace(/'/g, "''")}'::uuid`;
}

export function sqlBoolean(value: boolean): string {
	return value ? 'TRUE' : 'FALSE';
}

/** SQL numeric literal, or NULL. */
export function sqlNumber(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return 'NULL';
	return String(value);
}

/** SQL integer literal, or NULL. */
export function sqlInteger(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return 'NULL';
	return String(Math.trunc(value));
}

/** SQL date literal `YYYY-MM-DD`::date, or NULL. */
export function sqlDate(value: string | null | undefined): string {
	if (value == null) return 'NULL';
	return `${sqlString(value)}::date`;
}
