import { resolveFaviconSrc } from '@/lib/configure-favicon';
import { cn } from '@/lib/utils';

const BRAND_LOGO_SRC = '/brand/logo.svg';

interface BrandLockupProps {
	compact?: boolean;
	className?: string;
}

export function BrandLockup({ compact = false, className }: BrandLockupProps) {
	if (compact) {
		return (
			<img
				src={resolveFaviconSrc(import.meta.env.DEV)}
				alt="Mplifi"
				className={cn('h-8 w-8 shrink-0', className)}
			/>
		);
	}

	return <img src={BRAND_LOGO_SRC} alt="Mplifi" className={cn('h-8 w-auto object-contain dark:invert', className)} />;
}
