-- Optional room on a teacher availability slot (lesson location for that window).

ALTER TABLE public.teacher_availability
	ADD COLUMN room_id uuid REFERENCES public.rooms (id) ON DELETE SET NULL;

CREATE INDEX teacher_availability_room_id_idx ON public.teacher_availability (room_id);
