import type { UserOptional } from '@/types/users';

export function hasConfirmStepSelectedUser(selectedUser: UserOptional | null): boolean {
	return selectedUser !== null;
}
