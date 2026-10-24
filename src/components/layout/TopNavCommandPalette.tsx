import { LuLoaderCircle } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { UserDisplay } from '@/components/ui/user-display';
import { useCommandPaletteSearch } from '@/hooks/useCommandPaletteSearch';
import {
	buildCommandPaletteEmptyMessage,
	COMMAND_PALETTE_RESULT_GROUPS,
	type CommandPaletteResultItem,
	type CommandPaletteSearchResults,
	hasCommandPaletteResults,
} from '@/lib/layout/commandPaletteSearchHelpers';

interface TopNavCommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onNavigate: (href: string) => void;
}

function CommandPaletteResultRow({ item, onSelect }: { item: CommandPaletteResultItem; onSelect: () => void }) {
	return (
		<CommandItem
			value={`${item.kind}-${item.person.user_id}-${item.person.email}`}
			onSelect={onSelect}
			className="py-2"
		>
			<UserDisplay profile={item.person} showEmail className="flex-1" />
			{item.otherRoleLabel ? (
				<Badge variant="outline" className="ml-2 shrink-0">
					{item.otherRoleLabel}
				</Badge>
			) : null}
		</CommandItem>
	);
}

function CommandPaletteResultGroups({
	results,
	onSelect,
}: {
	results: CommandPaletteSearchResults;
	onSelect: (href: string) => void;
}) {
	return (
		<>
			{COMMAND_PALETTE_RESULT_GROUPS.map(({ key, heading }) => {
				const items = results[key];
				if (items.length === 0) return null;
				return (
					<CommandGroup key={key} heading={heading}>
						{items.map((item) => (
							<CommandPaletteResultRow
								key={`${key}-${item.person.user_id}`}
								item={item}
								onSelect={() => onSelect(item.href)}
							/>
						))}
					</CommandGroup>
				);
			})}
		</>
	);
}

export function TopNavCommandPalette({ open, onOpenChange, onNavigate }: TopNavCommandPaletteProps) {
	const { query, setQuery, loading, results } = useCommandPaletteSearch(open);

	const handleSelect = (href: string) => {
		onNavigate(href);
		onOpenChange(false);
	};

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput
				placeholder="Zoek leerlingen, docenten of gebruikers..."
				value={query}
				onValueChange={setQuery}
			/>
			<CommandList>
				{loading ? (
					<div className="flex items-center justify-center py-6">
						<LuLoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<>
						{hasCommandPaletteResults(results) ? null : (
							<CommandEmpty>{buildCommandPaletteEmptyMessage(query)}</CommandEmpty>
						)}
						<CommandPaletteResultGroups results={results} onSelect={handleSelect} />
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
}
