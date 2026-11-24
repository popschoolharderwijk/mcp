import { computeSidebarNavVisibility } from '@/hooks/sidebarNavVisibilityHelpers';
import { useAuth } from '@/hooks/useAuth';
import { useHasOwnedProjects } from '@/hooks/useHasOwnedProjects';

export function useSidebarNavVisibility() {
	const { isAdmin, isSiteAdmin, isPrivileged, isTeacher } = useAuth();
	const { hasOwnedProjects, isLoading: ownedProjectsLoading } = useHasOwnedProjects();

	return computeSidebarNavVisibility({
		isAdmin,
		isSiteAdmin,
		isPrivileged,
		isTeacher,
		hasOwnedProjects,
		ownedProjectsLoading,
	});
}
