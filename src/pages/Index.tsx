import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getDatabaseURL, isDevelopmentDatabase } from '@/lib/utils';

export default function Index() {
	const { user, signOut } = useAuth();
	const [role, setRole] = useState<string | null>(null);

	useEffect(() => {
		async function fetchRole() {
			if (!user) return;

			const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();

			if (data) {
				setRole(data.role);
			}
		}

		fetchRole();
	}, [user]);

	return (
		<div className="p-8 max-w-2xl mx-auto">
			<div className="flex justify-between items-start mb-6">
				<div>
					<h1 className="text-2xl font-bold mb-2">Database Info</h1>
					<p className="text-muted-foreground font-mono text-sm break-all">
						URL: {getDatabaseURL()}{' '}
						<strong>({isDevelopmentDatabase() ? 'development' : 'production'})</strong>
					</p>
				</div>
				<button
					type="button"
					onClick={signOut}
					className="px-4 py-2 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md"
				>
					Uitloggen
				</button>
			</div>

			{user && (
				<div className="bg-card border border-border p-4 rounded-md space-y-2">
					<p className="text-sm text-muted-foreground">Ingelogd als:</p>
					<p className="font-medium text-card-foreground">{user.email}</p>
					{role && (
						<p className="text-sm">
							<span className="text-muted-foreground">Rol: </span>
							<span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
								{role}
							</span>
						</p>
					)}
				</div>
			)}
		</div>
	);
}
