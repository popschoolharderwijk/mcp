import { useEffect, useState } from 'react';
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
import { roomVisibilityLabel } from '@/lib/rooms/roomVisibilityHelpers';
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

function roomFormError(form: RoomFormState): string | null {
	if (form.name.trim() === '') return 'Vul een naam in.';
	const capacity = Number.parseInt(form.maxCapacity, 10);
	if (!Number.isInteger(capacity) || capacity < 1) return 'Capaciteit moet minstens 1 zijn.';
	if (!/^#[0-9A-Fa-f]{6}$/.test(form.color)) return 'Kies een geldige kleur.';
	return null;
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

export default function RoomInfo() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const { setBreadcrumbSuffix } = useBreadcrumb();
	const isEditMode = Boolean(id);
	const hasAccess = isAdmin || isSiteAdmin;
	const [room, setRoom] = useState<RoomRow | null>(null);
	const [form, setForm] = useState<RoomFormState>(emptyForm);
	const [loading, setLoading] = useState(isEditMode);
	const [saving, setSaving] = useState(false);
	const [facilityDraft, setFacilityDraft] = useState('');

	useEffect(() => {
		if (!isEditMode || !id || authLoading || !hasAccess) return;
		let cancelled = false;
		setLoading(true);
		void supabase
			.from('rooms')
			.select('*')
			.eq('id', id)
			.maybeSingle()
			.then(({ data, error }) => {
				if (cancelled) return;
				if (error) {
					toast.error('Fout bij laden lokaal');
					setRoom(null);
				} else {
					setRoom(data);
					if (data) setForm(formFromRoom(data));
				}
				setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [authLoading, hasAccess, id, isEditMode]);

	useEffect(() => {
		if (!room) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: room.name }]);
		return () => setBreadcrumbSuffix([]);
	}, [room, setBreadcrumbSuffix]);

	const addFacility = () => {
		const next = facilityDraft.trim();
		if (!next || form.facilities.includes(next)) return;
		setForm({ ...form, facilities: [...form.facilities, next] });
		setFacilityDraft('');
	};

	const save = async () => {
		const validationError = roomFormError(form);
		if (validationError) {
			toast.error(validationError);
			return;
		}
		setSaving(true);
		const payload = roomWritePayload(form);
		try {
			if (isEditMode && id) {
				const { data, error } = await supabase.from('rooms').update(payload).eq('id', id).select('*').single();
				if (error) throw error;
				setRoom(data);
				setForm(formFromRoom(data));
				toast.success('Lokaal opgeslagen');
				return;
			}
			const { data, error } = await supabase.from('rooms').insert(payload).select('id').single();
			if (error) throw error;
			toast.success('Lokaal opgeslagen');
			navigate(`/rooms/${data.id}`);
		} catch (error) {
			const description = error instanceof Error ? error.message : 'Er is een onbekende fout opgetreden.';
			toast.error('Opslaan mislukt', { description });
		} finally {
			setSaving(false);
		}
	};

	if (authLoading || (isEditMode && loading)) return <PageSkeleton variant="header-and-cards" />;
	if (!hasAccess) return <Navigate to="/" replace />;

	const title = isEditMode ? form.name || room?.name || 'Lokaal' : 'Nieuw lokaal';
	const roomInitial = title.trim().charAt(0).toUpperCase() || 'L';

	return (
		<div className="space-y-6">
			{room ? (
				<div className="flex min-w-0 items-center gap-4">
					<Avatar className="h-20 w-20 flex-shrink-0">
						<AvatarImage
							src={room.image_url ?? undefined}
							alt={title}
							className="object-cover"
						/>
						<AvatarFallback
							className="text-2xl font-medium text-white"
							style={{ backgroundColor: room.color }}
						>
							{roomInitial}
						</AvatarFallback>
					</Avatar>
					<h1 className="text-2xl font-semibold leading-none tracking-tight truncate">{title}</h1>
				</div>
			) : (
				<PageHeader title={title} />
			)}
			{isEditMode && !room ? (
				<p className="text-sm text-muted-foreground">Lokaal niet gevonden.</p>
			) : (
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
									onValueChange={(value: RoomVisibility) =>
										setForm({ ...form, visibility: value })
									}
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
							<ColorPicker
								value={form.color}
								onChange={(color) => setForm({ ...form, color })}
								compact
							/>
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
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											addFacility();
										}
									}}
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
			)}
		</div>
	);
}
