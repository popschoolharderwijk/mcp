import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { hasAdminRole, isServiceRoleToken, stripBearerToken } from './invoicePure.ts';

export {
	buildInvoiceEmailDeliveryContent,
	buildResendInvoiceEmailPayload,
	canSendInvoiceEmail,
	computeDueDate,
	readInvoiceMailEnv,
	shouldRecordInvoiceEmailSent,
} from './invoicePure.ts';

export async function verifyAdminAccess(
	authHeader: string,
	supabaseUrl: string,
	anonKey: string,
	serviceKey: string,
): Promise<Response | null> {
	const token = stripBearerToken(authHeader);
	if (isServiceRoleToken(token, serviceKey)) return null;

	const userClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: authHeader } },
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const {
		data: { user },
	} = await userClient.auth.getUser();
	if (!user) return jsonResponse(401, { error: 'Unauthenticated' });

	const { data: roles } = await userClient.from('user_roles').select('role').eq('user_id', user.id);
	if (!hasAdminRole(roles)) return jsonResponse(403, { error: 'Alleen admins mogen facturen genereren' });
	return null;
}

export async function findExistingInvoice(
	admin: SupabaseClient,
	batchId: string,
	studentUserId: string,
): Promise<{ id: string; invoice_number: string } | null> {
	const { data } = await admin
		.from('invoices')
		.select('id, invoice_number')
		.eq('batch_id', batchId)
		.eq('student_user_id', studentUserId)
		.maybeSingle();
	return data;
}
