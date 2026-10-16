type IconColor = { icon: string; color: string };

const KEYWORD_STYLES: Array<{ test: RegExp; style: IconColor }> = [
	{ test: /basgitaar|\bbas\b|bass/i, style: { icon: 'GiGuitarBassHead', color: '#9333EA' } },
	{ test: /gitaar|guitar/i, style: { icon: 'LuGuitar', color: '#FF9500' } },
	{ test: /drum/i, style: { icon: 'LuDrum', color: '#DC2626' } },
	{ test: /zang|koor|vocal|singer/i, style: { icon: 'LuMic', color: '#EC4899' } },
	{ test: /toets|keyboard|piano/i, style: { icon: 'LuPiano', color: '#3B82F6' } },
	{ test: /sax/i, style: { icon: 'GiSaxophone', color: '#FFB8A6' } },
	{ test: /\bdj\b|beats/i, style: { icon: 'LuHeadphones', color: '#F59E0B' } },
	{ test: /band|groep|group/i, style: { icon: 'HiUserGroup', color: '#6366F1' } },
	{ test: /trompet|trumpet/i, style: { icon: 'GiTrumpet', color: '#EAB308' } },
	{ test: /productie|studio|faders/i, style: { icon: 'LuSlidersHorizontal', color: '#14B8A6' } },
];

const FALLBACK_COLORS = ['#0EA5E9', '#22C55E', '#A855F7', '#F97316', '#64748B', '#06B6D4', '#84CC16', '#E11D48'];

function hashName(name: string): number {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
	}
	return hash;
}

/** Pick icon/color from course name keywords, else LuMusic + stable palette color. */
export function resolveCourseIconColor(name: string): IconColor {
	for (const entry of KEYWORD_STYLES) {
		if (entry.test.test(name)) return entry.style;
	}
	const color = FALLBACK_COLORS[hashName(name) % FALLBACK_COLORS.length] ?? '#0EA5E9';
	return { icon: 'LuMusic', color };
}
