import { describe, expect, it } from 'bun:test';
import { classifyCourseFlags } from './courseFlagsHelpers';

describe('classifyCourseFlags', () => {
	it('marks DUO from name even when maxparticipants is 2', () => {
		expect(classifyCourseFlags('10 Gitaar DUO', 2)).toEqual({
			isDuoLesson: true,
			isGroupLesson: false,
		});
	});

	it('marks group when maxparticipants is greater than 1', () => {
		expect(classifyCourseFlags('Bandcoaching', 7)).toEqual({
			isDuoLesson: false,
			isGroupLesson: true,
		});
	});

	it('marks band or koor as group when maxparticipants is null', () => {
		expect(classifyCourseFlags('Spelen in een Band 8-11', null)).toEqual({
			isDuoLesson: false,
			isGroupLesson: true,
		});
		expect(classifyCourseFlags('Zangkoor', null)).toEqual({
			isDuoLesson: false,
			isGroupLesson: true,
		});
	});

	it('marks individual lessons otherwise', () => {
		expect(classifyCourseFlags('09 Gitaar', 1)).toEqual({
			isDuoLesson: false,
			isGroupLesson: false,
		});
		expect(classifyCourseFlags('Faders up individueel', null)).toEqual({
			isDuoLesson: false,
			isGroupLesson: false,
		});
	});
});
