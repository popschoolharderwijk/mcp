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
