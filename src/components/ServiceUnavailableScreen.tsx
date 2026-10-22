import { LuCloudOff } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

export function ServiceUnavailableScreen() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-4 text-center">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					<LuCloudOff className="h-6 w-6 text-muted-foreground" aria-hidden />
				</div>
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">Tijdelijk niet beschikbaar</h1>
					<p className="text-muted-foreground">
						Deze site is offline voor onderhoud. Probeer het later opnieuw.
					</p>
				</div>
				<Button type="button" variant="outline" onClick={() => window.location.reload()}>
					Opnieuw proberen
				</Button>
			</div>
		</div>
	);
}
