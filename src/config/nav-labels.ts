/**
 * Centrale bron voor navigatielabels (sidebar, breadcrumbs, paginatitels, command palette).
 * Gebruik deze constanten overal zodat we DRY blijven en geen typefouten zoals "Lestypen" vs "Lessoorten".
 */
export const NAV_LABELS = {
	dashboard: 'Dashboard',
	users: 'Gebruikers',
	lessonTypes: 'Lessoorten',
	settings: 'Instellingen',
	teachers: 'Docenten',
	availability: 'Beschikbaarheid',
	myProfile: 'Mijn profiel',
	myAvailability: 'Mijn beschikbaarheid',
	myStatistics: 'Mijn statistieken',
	students: 'Leerlingen',
	myStudents: 'Mijn leerlingen',
} as const;

export type NavLabelKey = keyof typeof NAV_LABELS;
