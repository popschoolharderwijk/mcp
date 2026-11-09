import { describe, expect, it } from 'bun:test';
import { isSidebarGroupRouteActive } from '../../../src/components/layout/sidebarGroupRouteHelpers';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-items';

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

	const adminSectionItem = {
		key: 'admin-section',
		label: NAV_LABELS.adminSection,
		icon: NAV_ICONS.adminSection,
		children: [
			{ key: '/users', href: '/users', label: NAV_LABELS.users, icon: NAV_ICONS.users },
			{ key: '/settings', href: '/settings', label: NAV_LABELS.settings, icon: NAV_ICONS.settings },
		],
	};

	it('matches nested child routes for linked parents', () => {
		expect(isSidebarGroupRouteActive('/teachers/availability', teachersItem)).toBe(true);
		expect(isSidebarGroupRouteActive('/teachers/abc', teachersItem)).toBe(true);
	});

	it('matches child routes for toggle-only parents', () => {
		expect(isSidebarGroupRouteActive('/users', adminSectionItem)).toBe(true);
		expect(isSidebarGroupRouteActive('/settings/extra', adminSectionItem)).toBe(true);
	});

	it('returns false for unrelated routes', () => {
		expect(isSidebarGroupRouteActive('/students', teachersItem)).toBe(false);
		expect(isSidebarGroupRouteActive('/agenda', adminSectionItem)).toBe(false);
	});
});
