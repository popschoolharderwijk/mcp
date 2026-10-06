export type StudentInfoTabId = 'profile' | 'parent' | 'agreements' | 'signups' | 'agenda';

export function resolveStudentInfoTabsDefaultValue(isPrivileged: boolean): StudentInfoTabId {
	return isPrivileged ? 'profile' : 'agreements';
}

/** Teachers may view a student agenda; only privileged users may edit it. */
export function resolveStudentDetailAccess(
	isPrivileged: boolean,
	isTeacher: boolean,
): {
	canView: boolean;
	canEditAgenda: boolean;
} {
	return {
		canView: isPrivileged || isTeacher,
		canEditAgenda: isPrivileged,
	};
}
