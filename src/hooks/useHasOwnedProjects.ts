import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns whether the current user owns at least one project.
 * Used to show/hide the Projects nav item for non-admin users.
 * RLS ensures non-admin users only see their own projects, so a single row means they have at least one.
 */
export function useHasOwnedProjects(): { hasOwnedProjects: boolean; isLoading: boolean } {
	const { user } = useAuth();
	const [hasOwnedProjects, setHasOwnedProjects] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const fetch = useCallback(async () => {
		if (!user) {
			setHasOwnedProjects(false);
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		const { data } = await supabase.from('projects').select('id').limit(1);
		setHasOwnedProjects((data?.length ?? 0) > 0);
		setIsLoading(false);
	}, [user]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { hasOwnedProjects, isLoading };
}
