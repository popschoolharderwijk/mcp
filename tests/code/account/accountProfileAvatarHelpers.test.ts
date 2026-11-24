import { describe, expect, it } from 'bun:test';
import {
	resolveAvatarUploadContentType,
	resolveAvatarUploadExtension,
} from '../../../src/lib/account/accountProfileAvatarHelpers';

describe('resolveAvatarUploadContentType', () => {
	it('prefers an allowed file type over a misleading extension', () => {
		expect(resolveAvatarUploadContentType({ type: 'image/png', name: 'a.bin' })).toBe('image/png');
	});

	it('normalizes image/jpg to image/jpeg', () => {
		expect(resolveAvatarUploadContentType({ type: 'image/jpg', name: 'a.jpg' })).toBe('image/jpeg');
	});

	it('derives mime type from extension when file type is missing', () => {
		expect(resolveAvatarUploadContentType({ type: '', name: 'avatar.PNG' })).toBe('image/png');
		expect(resolveAvatarUploadContentType({ type: '', name: 'avatar.jpeg' })).toBe('image/jpeg');
	});

	it('rejects unsupported types', () => {
		expect(resolveAvatarUploadContentType({ type: 'image/svg+xml', name: 'a.svg' })).toBeNull();
		expect(resolveAvatarUploadContentType({ type: '', name: 'a.bmp' })).toBeNull();
	});
});

describe('resolveAvatarUploadExtension', () => {
	it('maps jpeg to the jpg storage extension', () => {
		expect(resolveAvatarUploadExtension('image/jpeg')).toBe('jpg');
	});
});
