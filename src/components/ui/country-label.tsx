import { countryFlagUrl, countryLabelParts } from '@/lib/country/countryHelpers';
import { cn } from '@/lib/utils';

interface CountryLabelProps {
	countryCode: string;
	className?: string;
}

/** Flag + localized country name + ISO code (same pattern as ftm-polarsteps HomeCountryLabel). */
export function CountryLabel({ countryCode, className }: CountryLabelProps) {
	const flagUrl = countryFlagUrl(countryCode);
	const { name, code } = countryLabelParts(countryCode);

	return (
		<span className={cn('inline-flex min-w-0 items-center gap-2', className)} title={name}>
			{flagUrl ? (
				<img
					src={flagUrl}
					alt=""
					width={20}
					height={15}
					className="h-3.5 w-5 shrink-0 rounded-[1px] object-cover"
					loading="lazy"
				/>
			) : (
				<span className="inline-block h-3.5 w-5 shrink-0" aria-hidden />
			)}
			<span className="inline-flex min-w-0 items-baseline gap-1 truncate">
				<span className="truncate">{name}</span>
				{code ? <span className="shrink-0 text-[0.9em] uppercase text-muted-foreground">{code}</span> : null}
			</span>
		</span>
	);
}
