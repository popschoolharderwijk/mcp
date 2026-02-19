export function shiftDayIndex(index: number, shift: number): number {
	return (index + shift + 7) % 7;
}

export function displayDayToDbDay(displayIndex: number): number {
	return shiftDayIndex(displayIndex, 1);
}

export function dbDayToDisplayDay(dbIndex: number): number {
	return shiftDayIndex(dbIndex, -1);
}

export const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'] as const;

export const DAY_NAMES_DISPLAY = [...DAY_NAMES.slice(1), DAY_NAMES[0]] as const;

export function getDayNameFromDbIndex(index: number): string {
	return DAY_NAMES[index % 7];
}
