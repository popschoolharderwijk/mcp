import { LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { type ListCardView, resolveListCardView } from '@/lib/ui/listCardViewHelpers';
import type { ProjectDomain } from '@/types/projects';

interface ProjectDomainsListProps {
	domains: ProjectDomain[];
	onEdit: (domain: ProjectDomain) => void;
	onDelete: (domain: ProjectDomain) => void;
}

function ProjectDomainsList({ domains, onEdit, onDelete }: ProjectDomainsListProps) {
	return (
		<ul className="divide-y divide-border">
			{domains.map((domain) => (
				<li
					key={domain.id}
					className="flex items-center justify-between gap-2 px-4 py-1.5 text-sm hover:bg-accent"
				>
					<span className="truncate">{domain.name}</span>
					<div className="flex shrink-0 gap-0.5">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => onEdit(domain)}
							aria-label="Bewerken"
						>
							<LuPencil className="h-3.5 w-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-destructive hover:text-destructive"
							onClick={() => onDelete(domain)}
							aria-label="Verwijderen"
						>
							<LuTrash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</li>
			))}
		</ul>
	);
}

interface ProjectDomainEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editing: ProjectDomain | null;
	name: string;
	onNameChange: (value: string) => void;
	saving: boolean;
	onSave: () => void;
}

function ProjectDomainEditorDialog({
	open,
	onOpenChange,
	editing,
	name,
	onNameChange,
	saving,
	onSave,
}: ProjectDomainEditorDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{editing ? 'Domein bewerken' : 'Nieuw domein'}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="domain-name">Naam</Label>
						<Input
							id="domain-name"
							value={name}
							onChange={(e) => onNameChange(e.target.value)}
							placeholder="Bijv. Muziek"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Annuleren
					</Button>
					<SubmitButton onClick={onSave} loading={saving} disabled={!name.trim()}>
						{editing ? 'Opslaan' : 'Aanmaken'}
					</SubmitButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ProjectDomainsAddButton({ onClick }: { onClick: () => void }) {
	return (
		<Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onClick}>
			<LuPlus className="h-3.5 w-3.5" />
			Toevoegen
		</Button>
	);
}
function ProjectDomainsManagerCardContent({
	view,
	domains,
	onEdit,
	onDelete,
}: {
	view: ListCardView;
	domains: ProjectDomain[];
	onEdit: (domain: ProjectDomain) => void;
	onDelete: (domain: ProjectDomain) => void;
}) {
	if (view === 'loading') {
		return <p className="px-4 py-3 text-muted-foreground text-xs">Laden...</p>;
	}
	if (view === 'empty') {
		return <p className="px-4 py-3 text-muted-foreground text-xs">Geen domeinen</p>;
	}
	return <ProjectDomainsList domains={domains} onEdit={onEdit} onDelete={onDelete} />;
}

type ProjectDomainsManagerState = ReturnType<
	typeof import('@/hooks/useProjectDomainsManager').useProjectDomainsManager
>;

export function ProjectDomainsManagerCard({ state }: { state: ProjectDomainsManagerState }) {
	const view = resolveListCardView(state.loading, state.domains.length);

	return (
		<Card className="overflow-hidden">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-2.5 px-4">
				<CardTitle className="text-sm font-semibold">Domeinen</CardTitle>
				<ProjectDomainsAddButton onClick={state.openCreateDomain} />
			</CardHeader>
			<CardContent className="p-0">
				<ProjectDomainsManagerCardContent
					view={view}
					domains={state.domains}
					onEdit={state.openEditDomain}
					onDelete={state.setDeleteTarget}
				/>
			</CardContent>

			<ProjectDomainEditorDialog
				open={state.dialogOpen}
				onOpenChange={state.setDialogOpen}
				editing={state.editing}
				name={state.name}
				onNameChange={state.setName}
				saving={state.saving}
				onSave={state.handleSave}
			/>

			<ConfirmDeleteDialog
				open={!!state.deleteTarget}
				onOpenChange={(open) => !open && state.setDeleteTarget(null)}
				onConfirm={state.handleDelete}
				title="Domein verwijderen"
				description={`Weet je zeker dat je "${state.deleteTarget?.name}" wilt verwijderen? Dit kan alleen als er geen labels aan gekoppeld zijn.`}
			/>
		</Card>
	);
}
