/** Minimal Stripe schedule shapes — avoids importing `stripe` in unit tests. */
export interface SchedulePhaseItemLike {
	price: string | { id: string };
	quantity?: number | null;
}

export interface SchedulePhaseLike {
	start_date?: number | null;
	end_date?: number | null;
	items: SchedulePhaseItemLike[];
	default_payment_method?: string | { id?: string } | null;
	metadata?: Record<string, string> | null;
}

export interface KeptSchedulePhaseResult {
	keptPayloads: Array<Record<string, unknown>>;
	firstFutureIndex: number;
}

function mapSchedulePhaseItem(it: SchedulePhaseItemLike): {
	price: string;
	quantity: number;
} {
	return {
		price: typeof it.price === 'string' ? it.price : it.price.id,
		quantity: it.quantity ?? 1,
	};
}

export function resolveSchedulePhasePaymentMethod(
	dpm: string | { id?: string } | null | undefined,
): string | undefined {
	if (typeof dpm === 'string') return dpm;
	return dpm?.id;
}

function buildKeptSchedulePhasePayload(phase: SchedulePhaseLike): Record<string, unknown> {
	const paymentMethodId = resolveSchedulePhasePaymentMethod(phase.default_payment_method);
	return {
		start_date: phase.start_date,
		end_date: phase.end_date,
		proration_behavior: 'none',
		collection_method: 'charge_automatically',
		items: phase.items.map(mapSchedulePhaseItem),
		...(paymentMethodId ? { default_payment_method: paymentMethodId } : {}),
		metadata: phase.metadata ?? {},
	};
}

export function collectKeptSchedulePhases(existing: SchedulePhaseLike[], nowUnix: number): KeptSchedulePhaseResult {
	const keptPayloads: Array<Record<string, unknown>> = [];
	let firstFutureIndex = -1;

	for (let index = 0; index < existing.length; index++) {
		const phase = existing[index];
		if ((phase.start_date ?? 0) > nowUnix) {
			firstFutureIndex = index;
			break;
		}
		keptPayloads.push(buildKeptSchedulePhasePayload(phase));
	}

	return { keptPayloads, firstFutureIndex };
}

export function inheritSchedulePaymentMethod(keptPayloads: Array<Record<string, unknown>>): string | undefined {
	const activePhase = keptPayloads[keptPayloads.length - 1];
	const paymentMethod = activePhase?.default_payment_method;
	return typeof paymentMethod === 'string' ? paymentMethod : undefined;
}

export interface FuturePhaseTiming {
	startUnix: number;
	endUnix: number | null;
}

export function alignFuturePhasePayloads(
	futurePayloads: Array<Record<string, unknown>>,
	firstFutureIndex: number,
	newPhases: FuturePhaseTiming[],
): Array<Record<string, unknown>> {
	return futurePayloads.map((payload, index) => {
		const original = newPhases[firstFutureIndex + index];
		const { iterations: _ignored, ...rest } = payload;
		return {
			...rest,
			start_date: original.startUnix,
			end_date: original.endUnix,
		};
	});
}
