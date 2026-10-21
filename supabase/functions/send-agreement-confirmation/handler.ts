import { jsonResponse } from '../_shared/http.ts';
import { getSiteBaseUrl, type LessonAgreementPostContext } from '../_shared/http-serve.ts';
import { sendAgreementConfirmation } from '../_shared/sendAgreementConfirmation.ts';
import { requireAuthenticatedClients } from '../_shared/supabase.ts';

export async function handleSendAgreementConfirmation(ctx: LessonAgreementPostContext): Promise<Response> {
 const auth = await requireAuthenticatedClients(ctx.authHeader);
 if (!auth.ok) return auth.response;
 // RLS must let the caller read and manage the saved agreement; never trust the supplied ID.
 const [{ data: agreement }, { data: privileged }] = await Promise.all([
  auth.userClient.from('lesson_agreements').select('id, teacher_user_id').eq('id', ctx.lessonAgreementId).maybeSingle(),
  auth.userClient.rpc('is_privileged'),
 ]);
 if (!agreement || (privileged !== true && agreement.teacher_user_id !== auth.user.id)) return jsonResponse(403, { error: 'Geen rechten' });
 const sent = await sendAgreementConfirmation(ctx.lessonAgreementId, { admin: auth.admin, siteUrl: getSiteBaseUrl(ctx.req), origin: ctx.req.headers.get('origin'), sentBy: auth.user.id });
 return jsonResponse(sent ? 200 : 502, sent ? { ok: true } : { error: 'Overeenkomst opgeslagen, maar de mail is niet verstuurd' });
}
