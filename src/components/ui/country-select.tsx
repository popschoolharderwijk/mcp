import { useMemo, useState } from 'react';
import { LuCheck, LuChevronsUpDown } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CountryLabel } from '@/components/ui/country-label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { countryMatchesSearch, isIsoCountryCode, listIsoCountryCodes } from '@/lib/country/countryHelpers';
import { cn } from '@/lib/utils';

interface CountrySelectProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	id?: string;
	className?: string;
	placeholder?: string;
}

/**
 * Searchable country picker with flagcdn flags (ftm-polarsteps HomeCountryLabel pattern).
 */
export function CountrySelect({
	value,
	onChange,
	disabled = false,
	id,
	className,
	placeholder = 'Selecteer land...',
}: CountrySelectProps) {
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const countries = useMemo(() => listIsoCountryCodes(), []);
	const selectedCode = isIsoCountryCode(value) ? value : null;

	const filteredCountries = useMemo(
		() => countries.filter((code) => countryMatchesSearch(code, searchQuery)),
		[countries, searchQuery],
	);

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<Button
					id={id}
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn('w-full justify-between font-normal', className)}
				>
					{selectedCode ? (
						<CountryLabel countryCode={selectedCode} className="min-w-0" />
					) : (
						<span className="text-placeholder">{placeholder}</span>
					)}
					<LuChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
				<Command shouldFilter={false}>
					<CommandInput placeholder="Zoek land..." value={searchQuery} onValueChange={setSearchQuery} />
					<CommandList className="max-h-[280px] overflow-y-auto">
						<CommandEmpty>Geen landen gevonden.</CommandEmpty>
						<CommandGroup>
							{filteredCountries.map((code) => (
								<CommandItem
									key={code}
									value={code}
									onSelect={() => {
										onChange(code);
										setSearchQuery('');
										setOpen(false);
									}}
								>
									<LuCheck
										className={cn(
											'mr-2 h-4 w-4 shrink-0',
											selectedCode === code ? 'opacity-100' : 'opacity-0',
										)}
									/>
									<CountryLabel countryCode={code} className="flex-1" />
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
