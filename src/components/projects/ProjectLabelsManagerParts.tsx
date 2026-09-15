import type { ReactNode } from 'react';
import { LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import type { LabelWithDomain } from '@/lib/projects/projectLabelsManagerControllerHelpers';
import { type ListCardView, resolveListCardView } from '@/lib/ui/listCardViewHelpers';

interface ProjectLabelsListProps {
	labels: LabelWithDomain[];
	onEdit: (label: LabelWithDomain) => void;
	onDelete: (label: LabelWithDomain) => void;
}

function ProjectLabelsList({ labels, onEdit, onDelete }: ProjectLabelsListProps) {
	return (
		<ul className="divide-y divide-border">
			{labels.map((label) => (
				<li
					key={label.id}
					className="flex items-center justify-between gap-2 px-4 py-1.5 text-sm hover:bg-accent"
				>
					<div className="flex min-w-0 items-center gap-1.5">
						<span className="truncate">{label.name}</span>
						{label.project_domains && (
							<Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
								{label.project_domains.name}
							</Badge>
						)}
					</div>
					<div className="flex shrink-0 gap-0.5">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => onEdit(label)}
							aria-label="Bewerken"
						>
							<LuPencil className="h-3.5 w-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-destructive hover:text-destructive"
							onClick={() => onDelete(label)}
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

interface ProjectLabelEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editing: LabelWithDomain | null;
	name: string;
	onNameChange: (value: string) => void;
	domainId: string;
	onDomainIdChange: (value: string) => void;
	domains: Array<{ id: string; name: string }>;
	saving: boolean;
	onSave: () => void;
}

function ProjectLabelDialogShell({
	open,
	onOpenChange,
	editing,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editing: LabelWithDomain | null;
	children: ReactNode;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{editing ? 'Label bewerken' : 'Nieuw label'}</DialogTitle>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}

function ProjectLabelEditorDialog({
	open,
	onOpenChange,
	editing,
	name,
	onNameChange,
	domainId,
	onDomainIdChange,
	domains,
	saving,
	onSave,
}: ProjectLabelEditorDialogProps) {
	return (
		<ProjectLabelDialogShell open={open} onOpenChange={onOpenChange} editing={editing}>
			<div className="space-y-4 py-4">
				<div className="space-y-2">
					<Label htmlFor="label-name">Naam</Label>
					<Input
						id="label-name"
						value={name}
						onChange={(e) => onNameChange(e.target.value)}
						placeholder="Bijv. Pianolessen"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="label-domain">Domein</Label>
					<Select value={domainId} onValueChange={onDomainIdChange}>
						<SelectTrigger>
							<SelectValue placeholder="Selecteer een domein" />
						</SelectTrigger>
						<SelectContent>
							{domains.map((domain) => (
								<SelectItem key={domain.id} value={domain.id}>
									{domain.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<DialogFooter>
				<Button variant="outline" onClick={() => onOpenChange(false)}>
					Annuleren
				</Button>
				<SubmitButton onClick={onSave} loading={saving} disabled={!name.trim() || !domainId}>
					{editing ? 'Opslaan' : 'Aanmaken'}
				</SubmitButton>
			</DialogFooter>
		</ProjectLabelDialogShell>
	);
}
function ProjectLabelsManagerCardContent({
	view,
	labels,
	onEdit,
	onDelete,
}: {
	view: ListCardView;
	labels: LabelWithDomain[];
	onEdit: (label: LabelWithDomain) => void;
	onDelete: (label: LabelWithDomain) => void;
}) {
	if (view === 'loading') {
		return <p className="px-4 py-3 text-muted-foreground text-xs">Laden...</p>;
	}
	if (view === 'empty') {
		return <p className="px-4 py-3 text-muted-foreground text-xs">Geen labels</p>;
	}
	return <ProjectLabelsList labels={labels} onEdit={onEdit} onDelete={onDelete} />;
}

type ProjectLabelsManagerState = ReturnType<typeof import('@/hooks/useProjectLabelsManager').useProjectLabelsManager>;

export function ProjectLabelsManagerCard({ state }: { state: ProjectLabelsManagerState }) {
	const view = resolveListCardView(state.loading, state.labels.length);

	return (
		<Card className="overflow-hidden">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-2.5 px-4">
				<CardTitle className="text-sm font-semibold">Labels</CardTitle>
				<Button
					variant="outline"
					size="sm"
					className="h-7 gap-1 text-xs"
					onClick={state.openCreateLabel}
					disabled={state.domains.length === 0}
				>
					<LuPlus className="h-3.5 w-3.5" />
					Toevoegen
				</Button>
			</CardHeader>
			<CardContent className="p-0">
				<ProjectLabelsManagerCardContent
					view={view}
					labels={state.labels}
					onEdit={state.openEditLabel}
					onDelete={state.setDeleteTarget}
				/>
			</CardContent>

			<ProjectLabelEditorDialog
				open={state.dialogOpen}
				onOpenChange={state.setDialogOpen}
				editing={state.editing}
				name={state.name}
				onNameChange={state.setName}
				domainId={state.domainId}
				onDomainIdChange={state.setDomainId}
				domains={state.domains}
				saving={state.saving}
				onSave={state.handleSave}
			/>

			<ConfirmDeleteDialog
				open={!!state.deleteTarget}
				onOpenChange={(open) => !open && state.setDeleteTarget(null)}
				onConfirm={state.handleDelete}
				title="Label verwijderen"
				description={`Weet je zeker dat je "${state.deleteTarget?.name}" wilt verwijderen? Dit kan alleen als er geen projecten aan gekoppeld zijn.`}
			/>
		</Card>
	);
}
