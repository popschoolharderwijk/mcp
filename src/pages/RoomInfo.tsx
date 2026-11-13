import { type ReactNode, useEffect, useState } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { canManageRooms, roomVisibilityLabel } from '@/lib/rooms/roomVisibilityHelpers';
import type { RoomInsert, RoomRow, RoomVisibility } from '@/types/rooms';

const VISIBILITIES: RoomVisibility[] = ['public', 'internal', 'hidden'];

interface RoomFormState {
	name: string;
	description: string;
	notes: string;
	color: string;
	visibility: RoomVisibility;
	maxCapacity: string;
	facilities: string[];
}

function emptyForm(): RoomFormState {
	return {
		name: '',
		description: '',
		notes: '',
		color: '#cccccc',
		visibility: 'public',
		maxCapacity: '10',
		facilities: [],
	};
}

function formFromRoom(room: RoomRow): RoomFormState {
	return {
		name: room.name,
		description: room.description ?? '',
		notes: room.notes ?? '',
		color: room.color,
		visibility: room.visibility,
		maxCapacity: String(room.max_capacity),
		facilities: [...room.facilities],
	};
}

function roomCapacityError(maxCapacity: string): string | null {
	const capacity = Number.parseInt(maxCapacity, 10);
	if (!Number.isInteger(capacity) || capacity < 1) return 'Capaciteit moet minstens 1 zijn.';
	return null;
}

function roomColorError(color: string): string | null {
	if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return 'Kies een geldige kleur.';
	return null;
}

function roomFormError(form: RoomFormState): string | null {
	if (form.name.trim() === '') return 'Vul een naam in.';
	return roomCapacityError(form.maxCapacity) ?? roomColorError(form.color);
}

function roomWritePayload(form: RoomFormState): RoomInsert {
	return {
		name: form.name.trim(),
		description: form.description.trim() || null,
		notes: form.notes.trim() || null,
		color: form.color,
		visibility: form.visibility,
		max_capacity: Number.parseInt(form.maxCapacity, 10),
		facilities: form.facilities,
	};
}

function roomLoadAllowed(isEditMode: boolean, authLoading: boolean, hasAccess: boolean): boolean {
	if (!isEditMode || authLoading) return false;
	return hasAccess;
}

function roomLoadId(
	isEditMode: boolean,
	id: string | undefined,
	authLoading: boolean,
	hasAccess: boolean,
): string | null {
	if (!roomLoadAllowed(isEditMode, authLoading, hasAccess) || !id) return null;
	return id;
}

function applyRoomLoad(
	result: { data: RoomRow | null; error: { message: string } | null },
	cancelled: boolean,
	setRoom: (room: RoomRow | null) => void,
	setForm: (form: RoomFormState) => void,
	setLoading: (loading: boolean) => void,
): void {
	if (cancelled) return;
	setLoading(false);
	if (result.error) {
		toast.error('Fout bij laden lokaal');
		setRoom(null);
		return;
	}
	setRoom(result.data);
	if (!result.data) return;
	setForm(formFromRoom(result.data));
}

function saveErrorDescription(error: unknown): string {
	if (error instanceof Error) return error.message;
	return 'Er is een onbekende fout opgetreden.';
}

async function updateRoom(id: string, payload: RoomInsert): Promise<RoomRow> {
	const { data, error } = await supabase.from('rooms').update(payload).eq('id', id).select('*').single();
	if (error) throw error;
	return data;
}

async function createRoom(payload: RoomInsert): Promise<string> {
	const { data, error } = await supabase.from('rooms').insert(payload).select('id').single();
	if (error) throw error;
	return data.id;
}

async function saveRoomForm(params: {
	isEditMode: boolean;
	id: string | undefined;
	form: RoomFormState;
	setRoom: (room: RoomRow) => void;
	setForm: (form: RoomFormState) => void;
	navigate: (path: string) => void;
}): Promise<void> {
	const payload = roomWritePayload(params.form);
	if (params.isEditMode && params.id) {
		const data = await updateRoom(params.id, payload);
		params.setRoom(data);
		params.setForm(formFromRoom(data));
		toast.success('Lokaal opgeslagen');
		return;
	}
	const createdId = await createRoom(payload);
	toast.success('Lokaal opgeslagen');
	params.navigate(`/rooms/${createdId}`);
}

function roomPageTitle(isEditMode: boolean, formName: string, roomName: string | undefined): string {
	if (!isEditMode) return 'Nieuw lokaal';
	if (formName) return formName;
	if (roomName) return roomName;
	return 'Lokaal';
}

function bindRoomLoad(
	isEditMode: boolean,
	id: string | undefined,
	authLoading: boolean,
	hasAccess: boolean,
	setRoom: (room: RoomRow | null) => void,
	setForm: (form: RoomFormState) => void,
	setLoading: (loading: boolean) => void,
): () => void {
	const roomId = roomLoadId(isEditMode, id, authLoading, hasAccess);
	if (!roomId) return () => undefined;
	let cancelled = false;
	setLoading(true);
	void supabase
		.from('rooms')
		.select('*')
		.eq('id', roomId)
		.maybeSingle()
		.then((result) => {
			applyRoomLoad(result, cancelled, setRoom, setForm, setLoading);
		});
	return () => {
		cancelled = true;
	};
}

function bindRoomBreadcrumb(
	room: RoomRow | null,
	setBreadcrumbSuffix: (suffix: { label: string }[]) => void,
): () => void {
	if (!room) {
		setBreadcrumbSuffix([]);
		return () => undefined;
	}
	setBreadcrumbSuffix([{ label: room.name }]);
	return () => setBreadcrumbSuffix([]);
}

function commitFacilityDraft(
	form: RoomFormState,
	draft: string,
	setForm: (form: RoomFormState) => void,
	setDraft: (draft: string) => void,
): void {
	const facilities = nextFacilities(form.facilities, draft);
	if (!facilities) return;
	setForm({ ...form, facilities });
	setDraft('');
}

function addFacilityOnEnter(event: { key: string; preventDefault: () => void }, addFacility: () => void): void {
	if (event.key !== 'Enter') return;
	event.preventDefault();
	addFacility();
}

async function submitRoomForm(params: {
	isEditMode: boolean;
	id: string | undefined;
	form: RoomFormState;
	setRoom: (room: RoomRow) => void;
	setForm: (form: RoomFormState) => void;
	setSaving: (saving: boolean) => void;
	navigate: (path: string) => void;
}): Promise<void> {
	const validationError = roomFormError(params.form);
	if (validationError) {
		toast.error(validationError);
		return;
	}
	params.setSaving(true);
	try {
		await saveRoomForm(params);
	} catch (error) {
		toast.error('Opslaan mislukt', { description: saveErrorDescription(error) });
	} finally {
		params.setSaving(false);
	}
}

function roomPageIsLoading(authLoading: boolean, isEditMode: boolean, loading: boolean): boolean {
	if (authLoading) return true;
	return isEditMode && loading;
}

function nextFacilities(facilities: string[], draft: string): string[] | null {
	const next = draft.trim();
	if (!next || facilities.includes(next)) return null;
	return [...facilities, next];
}

function RoomSettingsGate(props: { isEditMode: boolean; room: RoomRow | null; children: ReactNode }) {
	if (props.isEditMode && !props.room) return <p className="text-sm text-muted-foreground">Lokaal niet gevonden.</p>;
	return props.children;
}

function RoomPageHeading(props: { room: RoomRow | null; title: string }) {
	if (!props.room) return <PageHeader title={props.title} />;
	const roomInitial = props.title.trim().charAt(0).toUpperCase() || 'L';
	return (
		<div className="flex min-w-0 items-center gap-4">
			<Avatar className="h-20 w-20 flex-shrink-0">
				<AvatarImage src={props.room.image_url ?? undefined} alt={props.title} className="object-cover" />
				<AvatarFallback
					className="text-2xl font-medium text-white"
					style={{ backgroundColor: props.room.color }}
				>
					{roomInitial}
				</AvatarFallback>
			</Avatar>
			<h1 className="text-2xl font-semibold leading-none tracking-tight truncate">{props.title}</h1>
		</div>
	);
}

export default function RoomInfo() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const { setBreadcrumbSuffix } = useBreadcrumb();
	const isEditMode = Boolean(id);
	const hasAccess = canManageRooms(isAdmin, isSiteAdmin);
	const [room, setRoom] = useState<RoomRow | null>(null);
	const [form, setForm] = useState<RoomFormState>(emptyForm);
	const [loading, setLoading] = useState(isEditMode);
	const [saving, setSaving] = useState(false);
	const [facilityDraft, setFacilityDraft] = useState('');

	useEffect(
		() => bindRoomLoad(isEditMode, id, authLoading, hasAccess, setRoom, setForm, setLoading),
		[authLoading, hasAccess, id, isEditMode],
	);

	useEffect(() => bindRoomBreadcrumb(room, setBreadcrumbSuffix), [room, setBreadcrumbSuffix]);

	if (roomPageIsLoading(authLoading, isEditMode, loading)) return <PageSkeleton variant="header-and-cards" />;
	if (!hasAccess) return <Navigate to="/" replace />;

	return (
		<RoomEditor
			isEditMode={isEditMode}
			id={id}
			room={room}
			form={form}
			setForm={setForm}
			setRoom={setRoom}
			saving={saving}
			setSaving={setSaving}
			facilityDraft={facilityDraft}
			setFacilityDraft={setFacilityDraft}
			navigate={navigate}
		/>
	);
}

function RoomEditor(props: {
	isEditMode: boolean;
	id: string | undefined;
	room: RoomRow | null;
	form: RoomFormState;
	setForm: (form: RoomFormState) => void;
	setRoom: (room: RoomRow) => void;
	saving: boolean;
	setSaving: (saving: boolean) => void;
	facilityDraft: string;
	setFacilityDraft: (draft: string) => void;
	navigate: (path: string) => void;
}) {
	const {
		isEditMode,
		id,
		room,
		form,
		setForm,
		setRoom,
		saving,
		setSaving,
		facilityDraft,
		setFacilityDraft,
		navigate,
	} = props;
	const addFacility = () => commitFacilityDraft(form, facilityDraft, setForm, setFacilityDraft);
	const save = () => submitRoomForm({ isEditMode, id, form, setRoom, setForm, setSaving, navigate });
	const title = roomPageTitle(isEditMode, form.name, room?.name);

	return (
		<div className="space-y-6">
			<RoomPageHeading room={room} title={title} />
			<RoomSettingsGate isEditMode={isEditMode} room={room}>
				<Card>
					<CardHeader>
						<CardTitle>Instellingen</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="room-name">
									Naam <span className="text-destructive">*</span>
								</Label>
								<Input
									id="room-name"
									value={form.name}
									onChange={(event) => setForm({ ...form, name: event.target.value })}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="room-visibility">Zichtbaarheid</Label>
								<Select
									value={form.visibility}
									onValueChange={(value: RoomVisibility) => setForm({ ...form, visibility: value })}
								>
									<SelectTrigger id="room-visibility">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{VISIBILITIES.map((visibility) => (
											<SelectItem key={visibility} value={visibility}>
												{roomVisibilityLabel(visibility)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<Label>Kleur</Label>
							<ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} compact />
						</div>

						<div className="space-y-2">
							<Label htmlFor="room-description">Beschrijving</Label>
							<Textarea
								id="room-description"
								rows={3}
								value={form.description}
								onChange={(event) => setForm({ ...form, description: event.target.value })}
								placeholder="Beschrijving van het lokaal..."
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="room-notes">Notities</Label>
							<Textarea
								id="room-notes"
								rows={2}
								value={form.notes}
								onChange={(event) => setForm({ ...form, notes: event.target.value })}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="room-capacity">Maximale capaciteit</Label>
							<Input
								id="room-capacity"
								type="number"
								min={1}
								value={form.maxCapacity}
								onChange={(event) => setForm({ ...form, maxCapacity: event.target.value })}
							/>
						</div>

						<div className="space-y-2">
							<Label>Faciliteiten</Label>
							<div className="mb-3 flex gap-2">
								<Input
									value={facilityDraft}
									onChange={(event) => setFacilityDraft(event.target.value)}
									onKeyDown={(event) => addFacilityOnEnter(event, addFacility)}
									placeholder="Nieuwe faciliteit..."
									className="flex-1"
								/>
								<Button
									type="button"
									size="icon"
									onClick={addFacility}
									aria-label="Faciliteit toevoegen"
								>
									<LuPlus className="h-4 w-4" />
								</Button>
							</div>
							<div className="flex flex-wrap gap-2">
								{form.facilities.map((facility) => (
									<Badge key={facility} variant="secondary" className="flex items-center gap-1">
										{facility}
										<button
											type="button"
											onClick={() =>
												setForm({
													...form,
													facilities: form.facilities.filter((item) => item !== facility),
												})
											}
											className="hover:text-destructive"
											aria-label={`${facility} verwijderen`}
										>
											<LuX className="h-3 w-3" />
										</button>
									</Badge>
								))}
							</div>
						</div>

						<SubmitButton loading={saving} loadingLabel="Opslaan..." onClick={() => void save()}>
							Opslaan
						</SubmitButton>
					</CardContent>
				</Card>
			</RoomSettingsGate>
		</div>
	);
}
