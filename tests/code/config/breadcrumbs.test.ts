import { describe, expect, it } from 'bun:test';
import { getBaseBreadcrumb } from '../../../src/config/breadcrumbs';

describe('getBaseBreadcrumb student routes', () => {
	it('never points non-privileged student crumbs at /students', () => {
		const detailHrefs = getBaseBreadcrumb('/students/50000000-0017-0000-0000-000000000000/profile', {
			isPrivileged: false,
		}).map((item) => item.href);
		const listHrefs = getBaseBreadcrumb('/students/my-students', { isPrivileged: false }).map((item) => item.href);

		expect(detailHrefs.includes('/students')).toBe(false);
		expect(listHrefs.includes('/students')).toBe(false);
	});
});
