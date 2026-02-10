/**
 * Day names in database order (0 = Sunday, 1 = Monday, etc.)
 * This matches the database day_of_week format
 */
export const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'] as const;

/**
 * Day names ordered starting with Monday (for display purposes)
 * This is useful for UI components that want to show Monday first
 */
export const DAY_NAMES_DISPLAY = [
	'Maandag',
	'Dinsdag',
	'Woensdag',
	'Donderdag',
	'Vrijdag',
	'Zaterdag',
	'Zondag',
] as const;

/**
 * Get day name by day of week (0 = Sunday, 1 = Monday, etc.)
 * @param dayOfWeek - Day of week in database format (0-6, where 0 = Sunday)
 * @returns Day name or "Onbekend" if invalid
 */
export function getDayName(dayOfWeek: number): string {
	if (dayOfWeek >= 0 && dayOfWeek < DAY_NAMES.length) {
		return DAY_NAMES[dayOfWeek];
	}
	return 'Onbekend';
}
