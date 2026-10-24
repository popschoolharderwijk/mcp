import { describe, expect, it } from 'bun:test';
import {
	hasUnseenTipsAwaitingTarget,
	hasUnseenTipsForPage,
	listTipsForPage,
	matchesRoute,
	selectAutoTip,
	spotlightClipPath,
} from '../../../src/lib/tips/tipsRegistryHelpers';
import type { TipDefinition, TipProgressMap } from '../../../src/types/tips';

const searchTip: TipDefinition = {
	id: 'command-search',
	title: 'Snel zoeken',
	body: 'body',
	routes: ['*'],
	target: 'command-search',
	completeOn: ['command-search-hotkey'],
};

const themeTip: TipDefinition = {
	id: 'theme-dark-mode',
	title: 'Thema',
	body: 'body',
	routes: ['*'],
	target: 'theme-toggle',
	completeOn: ['target-click'],
};

const agendaTip: TipDefinition = {
	id: 'agenda-fullscreen',
	title: 'Fullscreen',
	body: 'body',
	routes: ['/agenda'],
	target: 'agenda-fullscreen',
	completeOn: ['target-click', 'agenda-fullscreen-hotkey'],
};

const registry = [searchTip, themeTip, agendaTip];

describe('matchesRoute', () => {
	it('matches wildcard on any pathname', () => {
		expect(matchesRoute(searchTip, '/')).toBe(true);
		expect(matchesRoute(searchTip, '/agenda')).toBe(true);
	});

	it('matches exact pathname', () => {
		expect(matchesRoute(agendaTip, '/agenda')).toBe(true);
	});

	it('rejects non-matching pathname', () => {
		expect(matchesRoute(agendaTip, '/students')).toBe(false);
	});
});

describe('selectAutoTip', () => {
	it('returns first tip when progress empty', () => {
		expect(selectAutoTip(registry, '/students', {})?.id).toBe('command-search');
	});

	it('skips tips that already have progress', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
		};
		expect(selectAutoTip(registry, '/students', progress)?.id).toBe('theme-dark-mode');
	});

	it('returns agenda tip on /agenda when earlier tips done', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'dismissed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'completed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		};
		expect(selectAutoTip(registry, '/agenda', progress)?.id).toBe('agenda-fullscreen');
	});

	it('returns null when all matching tips have progress', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'dismissed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		};
		expect(selectAutoTip(registry, '/students', progress)).toBeNull();
	});

	it('returns null on /students when only agenda tip left', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'completed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		};
		expect(selectAutoTip(registry, '/students', progress)).toBeNull();
	});
});

describe('hasUnseenTipsForPage', () => {
	it('is true when matching tips have no progress', () => {
		expect(hasUnseenTipsForPage(registry, '/students', {})).toBe(true);
	});

	it('is false when all matching tips have progress', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'dismissed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		};
		expect(hasUnseenTipsForPage(registry, '/students', progress)).toBe(false);
	});

	it('is true on /agenda when only agenda tip is unseen', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'completed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		};
		expect(hasUnseenTipsForPage(registry, '/agenda', progress)).toBe(true);
		expect(hasUnseenTipsForPage(registry, '/students', progress)).toBe(false);
	});

	it('is false when matching unseen tips have no present target yet', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'completed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		};
		const present = (target: string) => target !== 'agenda-fullscreen';
		expect(hasUnseenTipsForPage(registry, '/agenda', progress, present)).toBe(false);
	});
});

describe('hasUnseenTipsAwaitingTarget', () => {
	it('is true when an unseen page tip target is missing', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'completed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		};
		const present = (target: string) => target !== 'agenda-fullscreen';
		expect(hasUnseenTipsAwaitingTarget(registry, '/agenda', progress, present)).toBe(true);
	});

	it('is false when all matching tips already have progress even if targets are missing', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'completed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
			'agenda-fullscreen': { status: 'dismissed', updatedAt: '2026-01-03T00:00:00.000Z', lastActionAt: null },
		};
		expect(hasUnseenTipsAwaitingTarget(registry, '/agenda', progress, () => false)).toBe(false);
	});
});

describe('listTipsForPage', () => {
	it('sorts by most recently seen first', () => {
		const progress: TipProgressMap = {
			'command-search': { status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', lastActionAt: null },
			'theme-dark-mode': { status: 'completed', updatedAt: '2026-01-03T00:00:00.000Z', lastActionAt: null },
			'agenda-fullscreen': { status: 'dismissed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		};
		expect(listTipsForPage(registry, '/agenda', progress).map((tip) => tip.id)).toEqual([
			'theme-dark-mode',
			'agenda-fullscreen',
			'command-search',
		]);
	});

	it('omits tips whose target is not present', () => {
		const present = (target: string) => target !== 'theme-toggle';
		expect(listTipsForPage(registry, '/agenda', {}, present).map((tip) => tip.id)).toEqual([
			'command-search',
			'agenda-fullscreen',
		]);
	});
});

describe('spotlightClipPath', () => {
	it('builds evenodd polygon with hole around rect', () => {
		const path = spotlightClipPath({ top: 10, left: 20, width: 100, height: 40 }, { width: 800, height: 600 }, 4);
		expect(path).toBe(
			'polygon(evenodd, 0 0, 800px 0, 800px 600px, 0 600px, 0 0, 16px 6px, 16px 54px, 124px 54px, 124px 6px, 16px 6px)',
		);
	});
});
