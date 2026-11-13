import type { Database, Tables } from '@/integrations/supabase/types';

export type RoomRow = Tables<'rooms'>;
export type RoomVisibility = Database['public']['Enums']['room_visibility'];
export type RoomInsert = Database['public']['Tables']['rooms']['Insert'];
