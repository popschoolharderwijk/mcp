import { describe, expect, it } from 'bun:test';
import {
	adminHrefs,
	adminNavItems,
	adminOperationalNavItems,
	financeNavItems,
	isPathInGroup,
	isSidebarParentActive,
	nextSidebarGroupOpen,
	teacherChildNavItems,
} from '../../../src/components/layout/sidebar-config';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-labels';

describe('sidebar nav item constants', () => {
	it('maps admin nav items to hrefs', () => {
		expect(adminHrefs).toEqual(
			adminNavItems.map((item) => item.href).concat(financeNavItems.map((item) => item.href)),
		);
	});

	it('maps finance nav items to hrefs', () => {
		expect(financeNavItems.map((item) => item.href)).toEqual([
			'/incasso',
			'/mandaten',
			'/facturen',
			'/boekhouding',
		]);
	});

	it('includes operational admin routes', () => {
		expect(adminOperationalNavItems.map((item) => item.href)).toEqual([
			'/agreements',
			'/lesson-groups',
			'/aanmeldingen',
			'/trial-lessons',
		]);
	});

	it('nests availability under teachers', () => {
		expect(teacherChildNavItems).toEqual([
			{ href: '/teachers/availability', label: NAV_LABELS.availability, icon: NAV_ICONS.availability },
		]);
	});
});

describe('isPathInGroup', () => {
	const hrefs = ['/users', '/lesson-types'];

	it('matches an exact href', () => {
		expect(isPathInGroup('/users', hrefs)).toBe(true);
	});

	it('matches nested paths under an href', () => {
		expect(isPathInGroup('/lesson-types/abc', hrefs)).toBe(true);
	});

	it('treats teacher availability as part of the teachers group', () => {
		expect(isPathInGroup('/teachers', ['/teachers'])).toBe(true);
		expect(isPathInGroup('/teachers/availability', ['/teachers'])).toBe(true);
		expect(isPathInGroup('/students', ['/teachers'])).toBe(false);
	});

	it('returns false for unrelated paths', () => {
		expect(isPathInGroup('/students', hrefs)).toBe(false);
	});
});

describe('isSidebarParentActive', () => {
	const teacherChildHrefs = ['/teachers/availability'];

	it('treats dashboard as exact match only', () => {
		expect(isSidebarParentActive('/', '/')).toBe(true);
		expect(isSidebarParentActive('/teachers', '/')).toBe(false);
	});

	it('marks teacher overview and teacher detail as active', () => {
		expect(isSidebarParentActive('/teachers', '/teachers', teacherChildHrefs)).toBe(true);
		expect(isSidebarParentActive('/teachers/abc', '/teachers', teacherChildHrefs)).toBe(true);
	});

	it('does not highlight a parent when a child is active', () => {
		const financeChildHrefs = financeNavItems.map((item) => item.href);
		expect(isSidebarParentActive('/mandaten', undefined, financeChildHrefs)).toBe(false);
		expect(isSidebarParentActive('/incasso', undefined, financeChildHrefs)).toBe(false);
		expect(isSidebarParentActive('/teachers/availability', '/teachers', teacherChildHrefs)).toBe(false);
	});

	it('highlights a linked parent on its own page', () => {
		expect(isSidebarParentActive('/teachers', '/teachers', teacherChildHrefs)).toBe(true);
	});

	it('marks availability as active on its own href', () => {
		expect(isSidebarParentActive('/teachers/availability', '/teachers/availability')).toBe(true);
	});
});

describe('nextSidebarGroupOpen', () => {
	it('toggles a parent that has no own page', () => {
		expect(nextSidebarGroupOpen('/mandaten', undefined, true)).toBe(false);
		expect(nextSidebarGroupOpen('/mandaten', undefined, false)).toBe(true);
	});

	it('toggles when already on the parent page', () => {
		expect(nextSidebarGroupOpen('/teachers', '/teachers', true)).toBe(false);
		expect(nextSidebarGroupOpen('/teachers', '/teachers', false)).toBe(true);
	});

	it('opens when navigating in from another page', () => {
		expect(nextSidebarGroupOpen('/agenda', '/teachers', false)).toBe(true);
		expect(nextSidebarGroupOpen('/agenda', '/teachers', true)).toBe(true);
	});

	it('opens when navigating from a child page to the parent', () => {
		expect(nextSidebarGroupOpen('/teachers/availability', '/teachers', true)).toBe(true);
		expect(nextSidebarGroupOpen('/teachers/availability', '/teachers', false)).toBe(true);
	});
});
