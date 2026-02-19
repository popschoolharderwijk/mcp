/**
 * User/profile types derived from Supabase profiles table.
 * Use for display and selection (e.g. user select, created user callback).
 */

import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/** Profile fields used for user display and selection (e.g. UsersSelect, onSuccess after creating a user). */
export type UserProfileDisplay = Pick<ProfileRow, 'user_id' | 'first_name' | 'last_name' | 'email' | 'avatar_url'>;
