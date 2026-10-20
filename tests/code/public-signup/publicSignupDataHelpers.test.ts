import { describe, expect, it } from 'bun:test';
import { fetchPublicSignupGroupOptions } from '../../../src/lib/public-signup/publicSignupDataHelpers';

const lessonGroups = [
	{
		id: 'group-1',
		name: 'Piano ma',
		day_of_week: 1,
		start_time: '16:00',
		duration_minutes: 45,
		frequency: 'weekly',
		teacher_user_id: 'teacher-1',
	},
];

describe('fetchPublicSignupGroupOptions', () => {
	it('returns empty array when no groups exist', async () => {
		const outcome = await fetchPublicSignupGroupOptions(
			{
				from: () => ({
					select: () => ({
						eq: () => ({
							eq: async () => ({ data: [] }),
						}),
					}),
				}),
			} as never,
			'lt-1',
		);
		expect(outcome).toEqual([]);
	});

	it('maps groups with profiles and member counts', async () => {
		const outcome = await fetchPublicSignupGroupOptions(
			{
				from: (table: string) => {
					if (table === 'lesson_groups') {
						return {
							select: () => ({
								eq: () => ({
									eq: async () => ({ data: lessonGroups }),
								}),
							}),
						};
					}
					if (table === 'profiles') {
						return {
							select: () => ({
								in: async () => ({
									data: [{ user_id: 'teacher-1', first_name: 'Tom', last_name: 'Jansen' }],
								}),
							}),
						};
					}
					return {
						select: () => ({
							in: () => ({
								is: async () => ({ data: [{ lesson_group_id: 'group-1' }] }),
							}),
						}),
					};
				},
			} as never,
			'lt-1',
		);
		expect(outcome).toEqual([
			{
				id: 'group-1',
				name: 'Piano ma',
				day_of_week: 1,
				start_time: '16:00',
				duration_minutes: 45,
				frequency: 'weekly',
				teacher_name: 'Tom Jansen',
				members_count: 1,
			},
		]);
	});

	it('returns null teacher name when profile is missing', async () => {
		const outcome = await fetchPublicSignupGroupOptions(
			{
				from: (table: string) => {
					if (table === 'lesson_groups') {
						return {
							select: () => ({
								eq: () => ({
									eq: async () => ({ data: lessonGroups }),
								}),
							}),
						};
					}
					if (table === 'profiles') {
						return {
							select: () => ({
								in: async () => ({ data: [] }),
							}),
						};
					}
					return {
						select: () => ({
							in: () => ({
								is: async () => ({ data: [] }),
							}),
						}),
					};
				},
			} as never,
			'lt-1',
		);
		expect(outcome).toEqual([
			{
				id: 'group-1',
				name: 'Piano ma',
				day_of_week: 1,
				start_time: '16:00',
				duration_minutes: 45,
				frequency: 'weekly',
				teacher_name: null,
				members_count: 0,
			},
		]);
	});
});
