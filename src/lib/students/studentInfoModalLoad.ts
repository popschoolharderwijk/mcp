import { supabase } from '@/integrations/supabase/client';
import {
	mergeStudentWithProfile,
	type StudentProfileFields,
	type StudentRecordFields,
} from '@/lib/students/studentInfoModalHelpers';
import type { Student } from '@/types/students';

async function fetchStudentRecord(userId: string): Promise<StudentRecordFields | null> {
	const { data, error } = await supabase
		.from('students')
		.select(
			'id, user_id, date_of_birth, parent_name, parent_email, parent_phone_number, created_at, updated_at, created_by, updated_by',
		)
		.eq('user_id', userId)
		.single();

	if (error) {
		console.error('Error loading student data:', error);
		return null;
	}

	return data as unknown as StudentRecordFields;
}

async function fetchStudentProfile(userId: string): Promise<StudentProfileFields | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select('user_id, email, first_name, last_name, avatar_url, phone_number')
		.eq('user_id', userId)
		.single();

	if (error) {
		console.error('Error loading profile data:', error);
		return null;
	}

	return data as unknown as StudentProfileFields;
}

export async function loadMergedStudentRecord(userId: string): Promise<Student | null> {
	const studentData = await fetchStudentRecord(userId);
	if (!studentData) {
		return null;
	}

	const profileData = await fetchStudentProfile(userId);
	if (!profileData) {
		return null;
	}

	return mergeStudentWithProfile(studentData, profileData);
}
