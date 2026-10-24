import { useEffect, useState } from 'react';
import { keyboardTargetFromEventTarget, shouldOpenCommandPaletteOnHotkey } from '@/lib/keyboard/keyboardHelpers';
import type { TopNavProfile } from '@/lib/layout/topNavHelpers';
import { fetchUserRoleAndProfile } from '@/lib/layout/topNavProfile';

export function useTopNavProfileData(userId: string | undefined) {
	const [role, setRole] = useState<string | null>(null);
	const [profile, setProfile] = useState<TopNavProfile | null>(null);

	useEffect(() => {
		async function loadRoleAndProfile() {
			if (!userId) return;
			const result = await fetchUserRoleAndProfile(userId);
			setRole(result.role);
			setProfile(result.profile);
		}

		void loadRoleAndProfile();

		const handleProfileUpdate = () => {
			void loadRoleAndProfile();
		};

		window.addEventListener('profile-updated', handleProfileUpdate);
		return () => window.removeEventListener('profile-updated', handleProfileUpdate);
	}, [userId]);

	return { role, profile };
}

export function useCommandPaletteHotkey(onToggle: () => void) {
	useEffect(() => {
		const down = (event: KeyboardEvent) => {
			if (
				!shouldOpenCommandPaletteOnHotkey({
					key: event.key,
					ctrlKey: event.ctrlKey,
					metaKey: event.metaKey,
					altKey: event.altKey,
					target: keyboardTargetFromEventTarget(event.target),
				})
			) {
				return;
			}
			event.preventDefault();
			onToggle();
		};

		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
	}, [onToggle]);
}
