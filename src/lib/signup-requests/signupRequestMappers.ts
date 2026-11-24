import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type SignupRequestRawRow = Tables<'lesson_signup_requests'> & {
	lesson_types: { name: string; is_group_lesson?: boolean } | { name: string; is_group_lesson?: boolean }[] | null;
	lesson_groups: { name: string } | { name: string }[] | null;
};

function unwrapSignupJoins(row: SignupRequestRawRow): {
	lessonType: { name: string; is_group_lesson?: boolean } | null;
	lessonGroup: { name: string } | null;
} {
	const lessonType = Array.isArray(row.lesson_types) ? row.lesson_types[0] : row.lesson_types;
	const lessonGroup = Array.isArray(row.lesson_groups) ? row.lesson_groups[0] : row.lesson_groups;
	return { lessonType: lessonType ?? null, lessonGroup: lessonGroup ?? null };
}

function mapSignupRequestDetail(row: SignupRequestRawRow): SignupRequestDetail {
	const { lessonType, lessonGroup } = unwrapSignupJoins(row);
	return {
		id: row.id,
		first_name: row.first_name,
		last_name: row.last_name,
		email: row.email,
		phone_number: row.phone_number,
		parent_name: row.parent_name,
		parent_email: row.parent_email,
		parent_phone_number: row.parent_phone_number,
		date_of_birth: row.date_of_birth,
		notes: row.notes,
		status: row.status,
		created_at: row.created_at,
		processed_at: row.processed_at,
		lesson_type_name: lessonType?.name ?? null,
		lesson_group_name: lessonGroup?.name ?? null,
	};
}

export async function fetchSignupRequestsByEmail(email: string): Promise<SignupRequestDetail[]> {
	const { data, error } = await supabase
		.from('lesson_signup_requests')
		.select('*, lesson_types(name), lesson_groups(name)')
		.eq('email', email)
		.neq('status', 'awaiting_confirmation')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error loading signup requests:', error);
		return [];
	}

	return (data ?? []).map((row) => mapSignupRequestDetail(row as SignupRequestRawRow));
}

export async function fetchSignupRequestsByEmails(emails: string[]): Promise<Map<string, SignupRequestDetail[]>> {
	if (emails.length === 0) {
		return new Map();
	}

	const { data, error } = await supabase
		.from('lesson_signup_requests')
		.select('*, lesson_types(name), lesson_groups(name)')
		.in('email', emails)
		.neq('status', 'awaiting_confirmation');

	if (error) {
		console.error('Error loading signup requests:', error);
		return new Map();
	}

	const map = new Map<string, SignupRequestDetail[]>();
	for (const row of data ?? []) {
		const detail = mapSignupRequestDetail(row as SignupRequestRawRow);
		const arr = map.get(detail.email) ?? [];
		arr.push(detail);
		map.set(detail.email, arr);
	}
	return map;
}
