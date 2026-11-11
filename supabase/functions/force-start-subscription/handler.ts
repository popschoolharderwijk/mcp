import type { LessonAgreementPostContext } from '../_shared/http-serve.ts';
import { createSupabaseClients, requirePrivilegedUser } from '../_shared/supabase.ts';
import { loadForceStartAgreement } from './loadForceStartAgreement.ts';
import { runForceStartSubscription } from './runForceStartSubscription.ts';

export async function handleForceStartSubscription({
	authHeader,
	lessonAgreementId,
}: LessonAgreementPostContext): Promise<Response> {
	const { userClient, admin } = createSupabaseClients(authHeader);
	const authn = await requirePrivilegedUser(userClient);
	if (!authn.ok) return authn.response;

	const loaded = await loadForceStartAgreement(admin, lessonAgreementId);
	if (!loaded.ok) return loaded.response;

	return runForceStartSubscription(admin, loaded.agreement, loaded.scheduleId);
}
