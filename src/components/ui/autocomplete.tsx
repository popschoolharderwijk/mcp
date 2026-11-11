import * as React from 'react';
import { LuCheck } from 'react-icons/lu';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type AutocompleteItem = {
	/** Committed input value when this row is chosen. */
	value: string;
	/** Primary line in the suggestion list. */
	label: string;
	/** Optional secondary line under the label. */
	description?: string;
};

export type AutocompleteProps = {
	value: string;
	onValueChange: (value: string) => void;
	items: readonly AutocompleteItem[];
	/** Fires only when a suggestion row is chosen (not on free typing). */
	onSelectItem?: (item: AutocompleteItem) => void;
	placeholder?: string;
	/** Shown when the query has no matches. Empty string hides the empty state. */
	emptyText?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	/** Extra props for the text input (value/onChange/disabled/id/className are owned here). */
	inputProps?: Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		'value' | 'onChange' | 'disabled' | 'id' | 'className'
	>;
};

/** Case-insensitive match on value, label, and description. Empty / exact-selected value keeps every item. */
export function filterAutocompleteItems(items: readonly AutocompleteItem[], query: string): AutocompleteItem[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return [...items];
	const exactSelected = items.some((item) => item.value.toLowerCase() === needle);
	if (exactSelected) return [...items];
	return items.filter((item) => {
		if (item.value.toLowerCase().includes(needle)) return true;
		if (item.label.toLowerCase().includes(needle)) return true;
		if (item.description?.toLowerCase().includes(needle)) return true;
		return false;
	});
}

function autocompleteItemSelected(item: AutocompleteItem, value: string): boolean {
	return item.value === value;
}

/**
 * Free-text input with optional suggestions. Typed text is always the value;
 * picking a row commits that item's `value` and closes the list.
 */
export function Autocomplete({
	value,
	onValueChange,
	items,
	onSelectItem,
	placeholder,
	emptyText = 'Geen suggesties.',
	disabled = false,
	id,
	className,
	inputProps,
}: AutocompleteProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [open, setOpen] = React.useState(false);
	const [listWidth, setListWidth] = React.useState<number>();
	const filtered = filterAutocompleteItems(items, value);
	const showEmpty = emptyText.length > 0 && value.trim().length > 0 && filtered.length === 0;
	const listOpen = open && !disabled && (filtered.length > 0 || showEmpty);

	React.useLayoutEffect(() => {
		if (!listOpen) return;
		setListWidth(inputRef.current?.offsetWidth);
	}, [listOpen]);

	const selectItem = (item: AutocompleteItem) => {
		onValueChange(item.value);
		onSelectItem?.(item);
		setOpen(false);
	};

	return (
		<Popover
			open={listOpen}
			onOpenChange={(next) => {
				if (!next) setOpen(false);
			}}
		>
			<PopoverAnchor asChild>
				<Input
					{...inputProps}
					ref={inputRef}
					id={id}
					value={value}
					disabled={disabled}
					placeholder={placeholder}
					role="combobox"
					aria-expanded={listOpen}
					aria-autocomplete="list"
					autoComplete={inputProps?.autoComplete ?? 'off'}
					className={cn(className)}
					onChange={(event) => {
						onValueChange(event.target.value);
						setOpen(true);
					}}
					onFocus={(event) => {
						inputProps?.onFocus?.(event);
						setOpen(true);
					}}
					onClick={(event) => {
						inputProps?.onClick?.(event);
						setOpen(true);
					}}
					onBlur={(event) => {
						inputProps?.onBlur?.(event);
					}}
					onKeyDown={(event) => {
						inputProps?.onKeyDown?.(event);
						if (event.defaultPrevented) return;
						if (event.key === 'Escape' && open) {
							event.preventDefault();
							setOpen(false);
						}
						if (event.key === 'ArrowDown' && !open) {
							setOpen(true);
						}
					}}
				/>
			</PopoverAnchor>
			<PopoverContent
				className="p-0"
				align="start"
				style={listWidth ? { width: listWidth } : undefined}
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<Command shouldFilter={false}>
					<CommandList className="max-h-[280px] overflow-y-auto">
						{showEmpty ? <CommandEmpty>{emptyText}</CommandEmpty> : null}
						{filtered.length > 0 ? (
							<CommandGroup>
								{filtered.map((item) => (
									<CommandItem
										key={item.value}
										value={`${item.label} ${item.value} ${item.description ?? ''}`}
										onMouseDown={(event) => event.preventDefault()}
										onSelect={() => selectItem(item)}
									>
										<LuCheck
											className={cn(
												'mr-2 h-4 w-4 shrink-0',
												autocompleteItemSelected(item, value) ? 'opacity-100' : 'opacity-0',
											)}
										/>
										<span className="flex min-w-0 flex-1 flex-col gap-0.5">
											<span className="truncate">{item.label}</span>
											{item.description ? (
												<span className="truncate text-muted-foreground text-xs">
													{item.description}
												</span>
											) : null}
										</span>
									</CommandItem>
								))}
							</CommandGroup>
						) : null}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
