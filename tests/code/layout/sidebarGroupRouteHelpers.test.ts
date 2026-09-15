import { describe, expect, it } from 'bun:test';
import { isSidebarGroupRouteActive } from '../../../src/components/layout/sidebarGroupRouteHelpers';
import { buildFinanceNavGroup } from '../../../src/components/layout/sidebarMainNavHelpers';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-labels';

describe('isSidebarGroupRouteActive', () => {
	const teachersItem = {
		key: 'teachers',
		href: '/teachers',
		label: NAV_LABELS.teachers,
		icon: NAV_ICONS.teachers,
		children: [
			{
				key: '/teachers/availability',
				href: '/teachers/availability',
				label: NAV_LABELS.availability,
				icon: NAV_ICONS.availability,
			},
		],
	};

	it('matches nested child routes for linked parents', () => {
		expect(isSidebarGroupRouteActive('/teachers/availability', teachersItem)).toBe(true);
		expect(isSidebarGroupRouteActive('/teachers/abc', teachersItem)).toBe(true);
	});

	it('matches finance child routes for toggle-only parents', () => {
		expect(isSidebarGroupRouteActive('/incasso', buildFinanceNavGroup())).toBe(true);
		expect(isSidebarGroupRouteActive('/mandaten/extra', buildFinanceNavGroup())).toBe(true);
	});

	it('returns false for unrelated routes', () => {
		expect(isSidebarGroupRouteActive('/students', teachersItem)).toBe(false);
		expect(isSidebarGroupRouteActive('/agenda', buildFinanceNavGroup())).toBe(false);
	});
});
