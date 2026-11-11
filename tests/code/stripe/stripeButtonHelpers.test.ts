import { afterEach, describe, expect, it, mock } from 'bun:test';
import { resolveStripeButtonUrl, runStripeButtonAction } from '../../../src/components/stripe/StripeButton';

describe('resolveStripeButtonUrl', () => {
	it('prefers href over resolveHref', async () => {
		expect(await resolveStripeButtonUrl({ href: 'https://billing.stripe.com/a' })).toBe(
			'https://billing.stripe.com/a',
		);
		expect(await resolveStripeButtonUrl({ resolveHref: async () => 'https://pay.example/t' })).toBe(
			'https://pay.example/t',
		);
		expect(await resolveStripeButtonUrl({ resolveHref: async () => null })).toBeNull();
		expect(await resolveStripeButtonUrl({})).toBeNull();
	});
});

describe('runStripeButtonAction', () => {
	const openMock = mock((..._args: unknown[]) => null);

	afterEach(() => {
		openMock.mockClear();
		Reflect.deleteProperty(globalThis, 'window');
	});

	it('opens resolved Stripe URLs and otherwise runs onClick', async () => {
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: { open: openMock },
		});
		await runStripeButtonAction({ href: 'https://billing.stripe.com/p/x' });
		expect(openMock).toHaveBeenCalledWith('https://billing.stripe.com/p/x', '_blank', 'noopener,noreferrer');

		openMock.mockClear();
		await runStripeButtonAction({ resolveHref: async () => null });
		expect(openMock).toHaveBeenCalledTimes(0);

		const onClick = mock(async () => undefined);
		await runStripeButtonAction({ onClick });
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
