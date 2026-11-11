import { useState } from 'react';
import { BsStripe } from 'react-icons/bs';
import { LuExternalLink } from 'react-icons/lu';
import { Button, type ButtonProps } from '@/components/ui/button';

export type StripeButtonProps = {
	children: React.ReactNode;
	/** Known Stripe URL opened in a new tab (shows external-link icon). */
	href?: string;
	/** Resolve a Stripe URL on click (shows external-link icon). */
	resolveHref?: () => Promise<string | null>;
	/** In-app Stripe action (no external-link icon). */
	onClick?: () => void | Promise<void>;
	disabled?: boolean;
	className?: string;
	variant?: ButtonProps['variant'];
};

function openExternalStripeUrl(url: string): void {
	window.open(url, '_blank', 'noopener,noreferrer');
}

export async function resolveStripeButtonUrl(input: {
	href?: string;
	resolveHref?: () => Promise<string | null>;
}): Promise<string | null> {
	if (input.href) return input.href;
	if (!input.resolveHref) return null;
	return input.resolveHref();
}

/** Execute Stripe button navigation or in-app action. */
export async function runStripeButtonAction(input: {
	href?: string;
	resolveHref?: () => Promise<string | null>;
	onClick?: () => void | Promise<void>;
}): Promise<void> {
	const url = await resolveStripeButtonUrl(input);
	if (url) {
		openExternalStripeUrl(url);
		return;
	}
	if (input.onClick) await input.onClick();
}

/** Shared Stripe-branded action button. External-link icon only for href / resolveHref. */
export function StripeButton({
	children,
	href,
	resolveHref,
	onClick,
	disabled = false,
	className,
	variant = 'outline',
}: StripeButtonProps) {
	const [pending, setPending] = useState(false);
	const opensExternal = Boolean(href || resolveHref);

	const handleClick = async () => {
		setPending(true);
		try {
			await runStripeButtonAction({ href, resolveHref, onClick });
		} finally {
			setPending(false);
		}
	};

	return (
		<Button
			type="button"
			variant={variant}
			className={className}
			disabled={disabled || pending}
			onClick={() => void handleClick()}
		>
			<BsStripe className="!size-4" />
			{children}
			{opensExternal ? <LuExternalLink className="!size-3.5 opacity-70" aria-hidden /> : null}
		</Button>
	);
}
