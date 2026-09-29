import type { ChangeEvent, RefObject } from 'react';
import { LuImage, LuLink, LuPencil, LuPlus, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CrudFormDialogActions } from '@/components/ui/crud-form-dialog-actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageShell } from '@/components/ui/page-shell';
import { Textarea } from '@/components/ui/textarea';
import { NAV_LABELS } from '@/config/nav-labels';
import type { Announcement } from '@/hooks/useAnnouncements';
import type { useAnnouncementsManager } from '@/hooks/useAnnouncementsManager';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { renderMarkdown } from '@/lib/markdown/render';
import {
	type AnnouncementsManagerCardView,
	resolveAnnouncementsManagerCardView,
} from '@/lib/settings/announcementsManagerCardHelpers';
import { audienceLabel } from '@/lib/settings/announcementsManagerHelpers';

type AnnouncementsManagerState = ReturnType<typeof useAnnouncementsManager>;

function AnnouncementsSchemaMissingPanel({ error }: { error: string | null }) {
	return (
		<div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
			<LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
			<div>
				<p className="font-medium">Nieuwsberichten zijn nog niet beschikbaar.</p>
				{error && <p className="mt-1 text-xs opacity-80">{error}</p>}
			</div>
		</div>
	);
}

function AnnouncementsManagerCardContent({
	view,
	error,
	announcements,
	onEdit,
	onDelete,
}: {
	view: AnnouncementsManagerCardView;
	error: string | null;
	announcements: Announcement[];
	onEdit: (announcement: Announcement) => void;
	onDelete: (announcement: Announcement) => void;
}) {
	if (view === 'schema-missing') return <AnnouncementsSchemaMissingPanel error={error} />;
	if (view === 'loading') return <p className="text-sm text-muted-foreground">Laden...</p>;
	if (view === 'empty') {
		return <p className="text-sm text-muted-foreground">Er zijn nog geen nieuwsberichten.</p>;
	}
	return <AnnouncementsList announcements={announcements} onEdit={onEdit} onDelete={onDelete} />;
}

export function AnnouncementsManagerCard({ state }: { state: AnnouncementsManagerState }) {
	const { announcements, isLoading, error, isSchemaMissing, openCreate } = state;
	const view = resolveAnnouncementsManagerCardView(isSchemaMissing, isLoading, announcements.length);

	return (
		<PageShell
			title={NAV_LABELS.announcements}
			description="Plaats berichten die getoond worden op het dashboard van docenten en/of leerlingen"
			actions={
				<Button onClick={openCreate} size="sm" disabled={isSchemaMissing}>
					<LuPlus className="mr-2 h-4 w-4" />
					Nieuw bericht
				</Button>
			}
		>
			<AnnouncementsManagerCardContent
				view={view}
				error={error}
				announcements={announcements}
				onEdit={state.openEdit}
				onDelete={state.setDeleteTarget}
			/>
		</PageShell>
	);
}

function AnnouncementsList({
	announcements,
	onEdit,
	onDelete,
}: {
	announcements: Announcement[];
	onEdit: (announcement: Announcement) => void;
	onDelete: (announcement: Announcement) => void;
}) {
	return (
		<ul className="divide-y divide-border">
			{announcements.map((a) => (
				<li key={a.id} className="flex items-center justify-between gap-3 py-3">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<p className="truncate font-medium">{a.title}</p>
							{a.published_at === null && (
								<Badge variant="outline" className="shrink-0">
									Concept
								</Badge>
							)}
						</div>
						<p className="text-sm text-muted-foreground">
							{audienceLabel(a.audience)}
							{a.published_at && (
								<>
									{' · '}
									Gepubliceerd op {formatDbDateToUi(a.published_at.slice(0, 10))}
								</>
							)}
						</p>
					</div>
					<div className="flex shrink-0 gap-1">
						<Button variant="ghost" size="icon" onClick={() => onEdit(a)} aria-label="Bewerken">
							<LuPencil className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-destructive hover:text-destructive"
							onClick={() => onDelete(a)}
							aria-label="Verwijderen"
						>
							<LuTrash2 className="h-4 w-4" />
						</Button>
					</div>
				</li>
			))}
		</ul>
	);
}

function AnnouncementsEditorTitleField({
	title,
	onTitleChange,
}: {
	title: string;
	onTitleChange: (value: string) => void;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor="ann-title">Titel</Label>
			<Input
				id="ann-title"
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				maxLength={200}
				placeholder="Bijv. Zomersluiting 2026"
			/>
		</div>
	);
}

function AnnouncementsEditorBodyField({
	body,
	uploading,
	bodyRef,
	fileInputRef,
	onBodyChange,
	onInsertLink,
	onPickImage,
	onImageUpload,
}: {
	body: string;
	uploading: boolean;
	bodyRef: RefObject<HTMLTextAreaElement>;
	fileInputRef: RefObject<HTMLInputElement>;
	onBodyChange: (value: string) => void;
	onInsertLink: () => void;
	onPickImage: () => void;
	onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label htmlFor="ann-body">Bericht (Markdown)</Label>
				<div className="flex gap-1">
					<Button type="button" variant="outline" size="sm" onClick={onInsertLink} disabled={uploading}>
						<LuLink className="mr-1 h-3.5 w-3.5" />
						Link
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={onPickImage} disabled={uploading}>
						<LuImage className="mr-1 h-3.5 w-3.5" />
						{uploading ? 'Uploaden...' : 'Afbeelding'}
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={onImageUpload}
					/>
				</div>
			</div>
			<Textarea
				id="ann-body"
				ref={bodyRef}
				value={body}
				onChange={(e) => onBodyChange(e.target.value)}
				rows={8}
				placeholder="Schrijf hier het bericht. Gebruik **vet**, *cursief*, [link](url) of voeg een afbeelding toe."
			/>
			{body.trim().length > 0 && (
				<div className="rounded-md border border-border bg-muted/30 p-3">
					<p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Voorvertoning
					</p>
					{renderMarkdown(body)}
				</div>
			)}
		</div>
	);
}

function AnnouncementsEditorAudienceField({
	audienceTeachers,
	audienceStudents,
	hasAudience,
	onTeachersChange,
	onStudentsChange,
}: {
	audienceTeachers: boolean;
	audienceStudents: boolean;
	hasAudience: boolean;
	onTeachersChange: (checked: boolean) => void;
	onStudentsChange: (checked: boolean) => void;
}) {
	return (
		<div className="space-y-2">
			<Label>Doelgroep</Label>
			<div className="flex flex-wrap gap-4">
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={audienceTeachers}
						onChange={(e) => onTeachersChange(e.target.checked)}
					/>
					Docenten
				</label>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={audienceStudents}
						onChange={(e) => onStudentsChange(e.target.checked)}
					/>
					Leerlingen
				</label>
			</div>
			{!hasAudience && <p className="text-xs text-destructive">Selecteer ten minste één doelgroep.</p>}
		</div>
	);
}

function AnnouncementsEditorPublishField({
	publish,
	onPublishChange,
}: {
	publish: boolean;
	onPublishChange: (checked: boolean) => void;
}) {
	return (
		<div className="space-y-2">
			<label className="flex items-center gap-2 text-sm">
				<input type="checkbox" checked={publish} onChange={(e) => onPublishChange(e.target.checked)} />
				Direct publiceren (zichtbaar op dashboards)
			</label>
		</div>
	);
}

export function AnnouncementsEditorDialog({ state }: { state: AnnouncementsManagerState }) {
	const {
		dialogOpen,
		setDialogOpen,
		editing,
		form,
		setForm,
		uploading,
		bodyRef,
		fileInputRef,
		handleInsertLink,
		handlePickImage,
		handleImageUpload,
		audience,
		dialogActions,
	} = state;

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{editing ? 'Bericht bewerken' : 'Nieuw nieuwsbericht'}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<AnnouncementsEditorTitleField
						title={form.title}
						onTitleChange={(title) => setForm({ ...form, title })}
					/>
					<AnnouncementsEditorBodyField
						body={form.body}
						uploading={uploading}
						bodyRef={bodyRef}
						fileInputRef={fileInputRef}
						onBodyChange={(body) => setForm({ ...form, body })}
						onInsertLink={handleInsertLink}
						onPickImage={handlePickImage}
						onImageUpload={handleImageUpload}
					/>
					<AnnouncementsEditorAudienceField
						audienceTeachers={form.audienceTeachers}
						audienceStudents={form.audienceStudents}
						hasAudience={audience.length > 0}
						onTeachersChange={(audienceTeachers) => setForm({ ...form, audienceTeachers })}
						onStudentsChange={(audienceStudents) => setForm({ ...form, audienceStudents })}
					/>
					<AnnouncementsEditorPublishField
						publish={form.publish}
						onPublishChange={(publish) => setForm({ ...form, publish })}
					/>
				</div>
				<CrudFormDialogActions {...dialogActions} />
			</DialogContent>
		</Dialog>
	);
}
