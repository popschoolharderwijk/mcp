
-- Add cancellation_type enum
CREATE TYPE public.cancellation_type AS ENUM ('student', 'teacher');

-- Add columns to agenda_event_deviations
ALTER TABLE public.agenda_event_deviations
  ADD COLUMN cancellation_type public.cancellation_type DEFAULT NULL,
  ADD COLUMN needs_reschedule boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.agenda_event_deviations.cancellation_type IS 'Who cancelled: student or teacher. Only set when is_cancelled = true.';
COMMENT ON COLUMN public.agenda_event_deviations.needs_reschedule IS 'True when teacher cancelled and lesson needs to be rescheduled.';
