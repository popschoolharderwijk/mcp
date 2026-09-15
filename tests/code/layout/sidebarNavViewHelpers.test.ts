import { describe, expect, it } from 'bun:test';
import {
	collapsedSidebarNavBranchParent,
	navItemLinkClassName,
	resolveNavItemLinkLayout,
	resolveSidebarGroupTrailingMode,
	resolveSidebarNavBranchLayout,
	sidebarNavBranchChildHrefs,
	sidebarNavBranchParentClick,
} from '../../../src/components/layout/sidebarNavViewHelpers';

describe('resolveNavItemLinkLayout', () => {
	it('uses a tooltip when the sidebar is collapsed', () => {
		expect(resolveNavItemLinkLayout(true, true)).toBe('collapsed-tooltip');
		expect(resolveNavItemLinkLayout(true, false)).toBe('collapsed-tooltip');
	});

	it('uses a trailing row when expanded with trailing content', () => {
		expect(resolveNavItemLinkLayout(false, true)).toBe('trailing-row');
	});

	it('uses a plain link when expanded without trailing content', () => {
		expect(resolveNavItemLinkLayout(false, false)).toBe('link');
	});
});

describe('navItemLinkClassName', () => {
	const stateClass = 'bg-primary';

	it('centers a collapsed link and keeps the active state', () => {
		expect(navItemLinkClassName({ collapsed: true, hasTrailing: false, stateClass })).toContain(
			'w-fit justify-center rounded-lg',
		);
		expect(navItemLinkClassName({ collapsed: true, hasTrailing: true, stateClass })).toContain(stateClass);
	});

	it('shrinks an expanded link that shares a trailing control', () => {
		const className = navItemLinkClassName({ collapsed: false, hasTrailing: true, stateClass });
		expect(className).toContain('min-w-0 flex-1');
		expect(className.includes(stateClass)).toBe(false);
	});

	it('uses a full-width expanded link without trailing content', () => {
		expect(navItemLinkClassName({ collapsed: false, hasTrailing: false, stateClass })).toContain(
			'w-full rounded-lg',
		);
		expect(navItemLinkClassName({ collapsed: false, hasTrailing: false, stateClass })).toContain(stateClass);
	});
});

describe('resolveSidebarNavBranchLayout', () => {
	it('renders a leaf without children', () => {
		expect(resolveSidebarNavBranchLayout(false, false)).toBe('leaf');
		expect(resolveSidebarNavBranchLayout(false, true)).toBe('leaf');
	});

	it('flattens children when the sidebar is collapsed', () => {
		expect(resolveSidebarNavBranchLayout(true, true)).toBe('collapsed-tree');
	});

	it('uses a collapsible group when expanded with children', () => {
		expect(resolveSidebarNavBranchLayout(true, false)).toBe('collapsible');
	});
});

describe('collapsedSidebarNavBranchParent', () => {
	it('hides a toggle-only parent in the collapsed tree', () => {
		expect(collapsedSidebarNavBranchParent(undefined, 'parent')).toBeNull();
	});

	it('keeps a linked parent in the collapsed tree', () => {
		expect(collapsedSidebarNavBranchParent('/teachers', 'parent')).toBe('parent');
	});
});

describe('sidebarNavBranchParentClick', () => {
	it('returns undefined without an open-change handler', () => {
		expect(sidebarNavBranchParentClick(undefined, '/teachers', '/teachers', true)).toBeUndefined();
	});

	it('toggles when already on the parent page', () => {
		const opens: boolean[] = [];
		const onClick =
			sidebarNavBranchParentClick((open) => opens.push(open), '/teachers', '/teachers', true) ??
			(() => undefined);
		onClick();
		expect(opens).toEqual([false]);
	});

	it('opens when navigating in from another page', () => {
		const opens: boolean[] = [];
		const onClick =
			sidebarNavBranchParentClick((open) => opens.push(open), '/agenda', '/teachers', false) ?? (() => undefined);
		onClick();
		expect(opens).toEqual([true]);
	});
});

describe('sidebarNavBranchChildHrefs', () => {
	it('returns an empty list without children', () => {
		expect(sidebarNavBranchChildHrefs(undefined)).toEqual([]);
	});

	it('maps child hrefs', () => {
		expect(
			sidebarNavBranchChildHrefs([
				{ key: 'a', href: '/a', label: 'A', icon: () => null },
				{ key: 'b', href: '/b', label: 'B', icon: () => null },
			]),
		).toEqual(['/a', '/b']);
	});
});

describe('resolveSidebarGroupTrailingMode', () => {
	it('hides trailing content when collapsed or without children', () => {
		expect(
			resolveSidebarGroupTrailingMode({ collapsed: true, hasChildren: true, isLink: true, hasOpenChange: true }),
		).toBe('none');
		expect(
			resolveSidebarGroupTrailingMode({
				collapsed: false,
				hasChildren: false,
				isLink: true,
				hasOpenChange: true,
			}),
		).toBe('none');
	});

	it('shows a clickable toggle for toggle-only parents with an open-change handler', () => {
		expect(
			resolveSidebarGroupTrailingMode({
				collapsed: false,
				hasChildren: true,
				isLink: false,
				hasOpenChange: true,
			}),
		).toBe('toggle');
	});

	it('shows a plain chevron without an open-change handler', () => {
		expect(
			resolveSidebarGroupTrailingMode({
				collapsed: false,
				hasChildren: true,
				isLink: true,
				hasOpenChange: false,
			}),
		).toBe('chevron');
	});

	it('shows a toggle button for linked parents with an open-change handler', () => {
		expect(
			resolveSidebarGroupTrailingMode({ collapsed: false, hasChildren: true, isLink: true, hasOpenChange: true }),
		).toBe('toggle');
	});
});
