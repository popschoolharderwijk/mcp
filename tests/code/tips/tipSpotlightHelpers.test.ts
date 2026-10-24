import { describe, expect, it } from 'bun:test';
import { tipSpotlightCardPosition, tipSpotlightHole } from '../../../src/lib/tips/tipSpotlightHelpers';

function fakeRect(partial: Pick<DOMRect, 'top' | 'left' | 'width' | 'height' | 'bottom'>): DOMRect {
	return {
		...partial,
		right: partial.left + partial.width,
		x: partial.left,
		y: partial.top,
		toJSON: () => ({}),
	};
}

describe('tipSpotlightHole', () => {
	it('expands the target rect by hole padding', () => {
		expect(tipSpotlightHole(fakeRect({ top: 10, left: 20, width: 100, height: 40, bottom: 50 }))).toEqual({
			top: 4,
			left: 14,
			width: 112,
			height: 52,
		});
	});
});

describe('tipSpotlightCardPosition', () => {
	it('places the card below when there is room', () => {
		expect(
			tipSpotlightCardPosition(fakeRect({ top: 40, left: 30, width: 80, height: 20, bottom: 60 }), {
				width: 800,
				height: 600,
			}),
		).toEqual({ top: 78, left: 30 });
	});

	it('places the card above near the bottom of the viewport', () => {
		expect(
			tipSpotlightCardPosition(fakeRect({ top: 500, left: 30, width: 80, height: 20, bottom: 520 }), {
				width: 800,
				height: 560,
			}),
		).toEqual({ top: 322, left: 30 });
	});
});
