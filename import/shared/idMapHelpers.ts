export type MongoIdMap = Record<string, Record<string, string>>;

export function createEmptyIdMap(): MongoIdMap {
	return {};
}

export function getMappedId(map: MongoIdMap, entityType: string, mongoOid: string): string | undefined {
	return map[entityType]?.[mongoOid];
}

export function setMappedId(map: MongoIdMap, entityType: string, mongoOid: string, newId: string): MongoIdMap {
	const entityBucket = { ...(map[entityType] ?? {}), [mongoOid]: newId };
	return { ...map, [entityType]: entityBucket };
}

export function ensureMappedId(
	map: MongoIdMap,
	entityType: string,
	mongoOid: string,
	createId: () => string,
): { map: MongoIdMap; id: string; created: boolean } {
	const existing = getMappedId(map, entityType, mongoOid);
	if (existing) {
		return { map, id: existing, created: false };
	}
	const id = createId();
	return { map: setMappedId(map, entityType, mongoOid, id), id, created: true };
}
