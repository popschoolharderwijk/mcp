/** Persist a replacement link only when delivery succeeded; failed mail keeps the old link live. */
export async function deliverPaymentLink(send: () => Promise<boolean>, commit: () => Promise<void>): Promise<boolean> {
	if (!(await send())) return false;
	await commit();
	return true;
}
