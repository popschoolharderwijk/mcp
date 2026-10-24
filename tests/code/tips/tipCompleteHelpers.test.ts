import { describe, expect, it } from 'bun:test';
import {
	resolveTipIdFromCompleteOn,
	resolveTipIdFromTargetClick,
	tipCompletesOn,
} from '../../../src/lib/tips/tipCompleteHelpers';
import type { TipDefinition } from '../../../src/types/tips';

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

const agendaFullscreenTip: TipDefinition = {
	id: 'agenda-fullscreen',
	title: 'Fullscreen',
	body: 'body',
	routes: ['/agenda'],
	target: 'agenda-fullscreen',
	completeOn: ['target-click', 'agenda-fullscreen-hotkey'],
};

const registry = [searchTip, themeTip, agendaFullscreenTip];

describe('tipCompletesOn', () => {
	it('matches listed modes only', () => {
		expect(tipCompletesOn(searchTip, 'command-search-hotkey')).toBe(true);
		expect(tipCompletesOn(searchTip, 'target-click')).toBe(false);
		expect(tipCompletesOn(agendaFullscreenTip, 'target-click')).toBe(true);
		expect(tipCompletesOn(agendaFullscreenTip, 'agenda-fullscreen-hotkey')).toBe(true);
	});
});

describe('resolveTipIdFromCompleteOn', () => {
	it('returns tip id for the matching mode', () => {
		expect(resolveTipIdFromCompleteOn(registry, 'command-search-hotkey')).toBe('command-search');
		expect(resolveTipIdFromCompleteOn(registry, 'agenda-fullscreen-hotkey')).toBe('agenda-fullscreen');
		expect(resolveTipIdFromCompleteOn(registry, 'agenda-nav-keys')).toBeNull();
	});
});

describe('resolveTipIdFromTargetClick', () => {
	it('returns tip id only when target-click is allowed', () => {
		expect(resolveTipIdFromTargetClick(registry, 'theme-toggle')).toBe('theme-dark-mode');
		expect(resolveTipIdFromTargetClick(registry, 'agenda-fullscreen')).toBe('agenda-fullscreen');
		expect(resolveTipIdFromTargetClick(registry, 'command-search')).toBeNull();
		expect(resolveTipIdFromTargetClick(registry, null)).toBeNull();
		expect(resolveTipIdFromTargetClick(registry, 'missing')).toBeNull();
	});
});
