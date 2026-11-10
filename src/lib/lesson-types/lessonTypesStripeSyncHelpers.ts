export type StripeCatalogOptionStatus = 'pending' | 'synced' | 'error';

export type LessonTypeStripeSyncStatus = StripeCatalogOptionStatus;

/** Payload fragment that marks an option as waiting for Stripe catalog sync. */
export function buildPendingStripeCatalogStatusPatch(): {
	stripe_catalog_status: 'pending';
	stripe_catalog_sync_error: null;
} {
	return {
		stripe_catalog_status: 'pending',
		stripe_catalog_sync_error: null,
	};
}

/** Roll option statuses up to one lesson-type badge status. */
export function rollupLessonTypeStripeSyncStatus(
	statuses: ReadonlyArray<StripeCatalogOptionStatus | null | undefined>,
): LessonTypeStripeSyncStatus {
	let hasPending = false;
	for (const status of statuses) {
		if (status === 'error') return 'error';
		if (status === 'pending') hasPending = true;
	}
	return hasPending ? 'pending' : 'synced';
}

export function lessonTypesHaveUnsyncedStripeCatalog(
	rows: ReadonlyArray<{ stripe_sync_status: LessonTypeStripeSyncStatus }>,
): boolean {
	return rows.some((row) => row.stripe_sync_status !== 'synced');
}

export function lessonTypeStripeSyncStatusLabel(status: LessonTypeStripeSyncStatus): string {
	if (status === 'error') return 'Fout';
	if (status === 'pending') return 'In afwachting';
	return 'Gesynchroniseerd';
}

export function lessonTypeStripeSyncStatusVariant(
	status: LessonTypeStripeSyncStatus,
): 'destructive' | 'secondary' | 'default' {
	if (status === 'error') return 'destructive';
	if (status === 'pending') return 'secondary';
	return 'default';
}
