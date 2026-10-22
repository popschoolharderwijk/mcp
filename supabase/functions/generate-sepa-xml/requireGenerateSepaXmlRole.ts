import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { canGenerateSepaXml, resolveGenerateSepaXmlForbiddenError } from './generateSepaXmlHandlerHelpers.ts';

export async function requireGenerateSepaXmlRole(userClient: SupabaseClient, userId: string): Promise<Response | null> {
	const { data: roleRow } = await userClient.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
	if (!canGenerateSepaXml(roleRow?.role)) {
		const forbidden = resolveGenerateSepaXmlForbiddenError();
		return jsonResponse(forbidden.status, { error: forbidden.error });
	}
	return null;
}
