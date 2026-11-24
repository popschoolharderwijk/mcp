import { Navigate } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import StudentDetail from '@/pages/StudentDetail';
import TeacherInfo from '@/pages/TeacherInfo';
import UserDetail from '@/pages/UserDetail';

const OWN_PROFILE_PAGES = {
	teacher: TeacherInfo,
	user: UserDetail,
	student: StudentDetail,
} as const;

function resolveOwnProfileKind(isTeacher: boolean, isPrivileged: boolean) {
	if (isTeacher) return 'teacher' as const;
	if (isPrivileged) return 'user' as const;
	return 'student' as const;
}

/** Own profile at `/profile` — same pages as `/teachers/:id`, `/students/:userId`, `/users/:userId`. */
export default function Profile() {
	const { isTeacher, isPrivileged, isLoading: authLoading, user } = useAuth();

	if (authLoading) {
		return <PageSkeleton variant="header-and-tabs" />;
	}

	if (!user) {
		return <Navigate to="/" replace />;
	}

	const Page = OWN_PROFILE_PAGES[resolveOwnProfileKind(isTeacher, isPrivileged)];
	return <Page />;
}
