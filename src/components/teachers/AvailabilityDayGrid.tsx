import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AvailabilityDayItem {
	id: string;
}

interface AvailabilityDayGridProps<T extends AvailabilityDayItem> {
	dayNames: readonly string[];
	availabilityByDay: Partial<Record<number, T[]>>;
	renderSlot: (item: T) => ReactNode;
}

export function AvailabilityDayGrid<T extends AvailabilityDayItem>({
	dayNames,
	availabilityByDay,
	renderSlot,
}: AvailabilityDayGridProps<T>) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{dayNames.map((dayName, dayIndex) => {
				const dayAvailability = availabilityByDay[dayIndex] || [];
				return (
					<Card key={dayName}>
						<CardHeader>
							<CardTitle>{dayName}</CardTitle>
							<CardDescription>
								{dayAvailability.length} beschikbaarheidsblok
								{dayAvailability.length !== 1 ? 'ken' : ''}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{dayAvailability.length === 0 ? (
								<p className="text-sm text-muted-foreground">Geen beschikbaarheid</p>
							) : (
								<div className="space-y-2">{dayAvailability.map((avail) => renderSlot(avail))}</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
