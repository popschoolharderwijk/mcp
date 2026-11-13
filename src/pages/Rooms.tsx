import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { roomVisibilityBadgeVariant, roomVisibilityLabel } from '@/lib/rooms/roomVisibilityHelpers';
import type { RoomRow } from '@/types/rooms';

export default function Rooms() {
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const hasAccess = isAdmin || isSiteAdmin;
	const [rooms, setRooms] = useState<RoomRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [roomToDelete, setRoomToDelete] = useState<RoomRow | null>(null);

	const loadRooms = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase.from('rooms').select('*').order('name', { ascending: true });
		if (error) {
			toast.error('Fout bij laden lokalen');
			setRooms([]);
		} else {
			setRooms(data ?? []);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		if (authLoading || !hasAccess) return;
		void loadRooms();
	}, [authLoading, hasAccess, loadRooms]);

	const columns = useMemo<DataTableColumn<RoomRow>[]>(
		() => [
			{
				key: 'name',
				label: 'Naam',
				sortable: true,
				sortValue: (room) => room.name,
				render: (room) => (
					<span className="flex items-center gap-2 font-medium">
						<Avatar className="h-8 w-8 flex-shrink-0">
							<AvatarImage
								src={room.image_url ?? undefined}
								alt={room.name}
								className="object-cover"
							/>
							<AvatarFallback
								className="text-xs font-medium text-white"
								style={{ backgroundColor: room.color }}
							>
								{room.name.trim().charAt(0).toUpperCase() || 'L'}
							</AvatarFallback>
						</Avatar>
						{room.name}
					</span>
				),
			},
			{
				key: 'max_capacity',
				label: 'Capaciteit',
				sortable: true,
				sortValue: (room) => room.max_capacity,
				render: (room) => `${room.max_capacity} personen`,
			},
			{
				key: 'visibility',
				label: 'Zichtbaarheid',
				sortable: true,
				sortValue: (room) => roomVisibilityLabel(room.visibility),
				render: (room) => (
					<Badge variant={roomVisibilityBadgeVariant(room.visibility)}>
						{roomVisibilityLabel(room.visibility)}
					</Badge>
				),
			},
		],
		[],
	);

	const confirmDelete = async () => {
		if (!roomToDelete) return;
		const { error } = await supabase.from('rooms').delete().eq('id', roomToDelete.id);
		if (error) {
			toast.error('Verwijderen mislukt');
			throw error;
		}
		toast.success('Lokaal verwijderd');
		setRooms((current) => current.filter((room) => room.id !== roomToDelete.id));
	};

	if (authLoading) return <PageSkeleton variant="header-and-cards" />;
	if (!hasAccess) return <Navigate to="/" replace />;

	return (
		<div>
			<NavPageShell
				item="rooms"
				actions={
					<Button onClick={() => navigate('/rooms/new')}>
						<LuPlus className="mr-2 h-4 w-4" />
						Lokaal toevoegen
					</Button>
				}
			>
				<DataTable
					data={rooms}
					columns={columns}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					searchPlaceholder="Zoek op naam of beschrijving..."
					searchFields={[(room) => room.name, (room) => room.description]}
					loading={loading}
					getRowKey={(room) => room.id}
					getRowClassName={(room) => (room.visibility === 'hidden' ? 'opacity-50' : undefined)}
					emptyMessage="Geen lokalen gevonden"
					initialSortColumn="name"
					initialSortDirection="asc"
					rowActions={{
						onEdit: (room) => navigate(`/rooms/${room.id}`),
						onDelete: (room) => setRoomToDelete(room),
					}}
				/>
			</NavPageShell>
			<ConfirmDeleteDialog
				open={roomToDelete !== null}
				onOpenChange={(open) => {
					if (!open) setRoomToDelete(null);
				}}
				title="Lokaal verwijderen"
				description={
					roomToDelete
						? `Weet je zeker dat je ${roomToDelete.name} wilt verwijderen?`
						: ''
				}
				onConfirm={confirmDelete}
			/>
		</div>
	);
}
