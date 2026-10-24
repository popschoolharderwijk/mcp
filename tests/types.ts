import type { Insert } from '../src/integrations/supabase/insert-helpers';

/**
 * Centralized Supabase type definitions for tests.
 * Import these types instead of defining them in each test file.
 */

// Insert types (audit fields omitted; triggers set them)
export type AgendaEventInsert = Insert<'agenda_events'>;
export type AgendaEventDeviationInsert = Insert<'agenda_event_deviations'>;
export type AgendaParticipantInsert = Insert<'agenda_participants'>;
export type AnnouncementInsert = Insert<'announcements'>;
export type LessonAgreementInsert = Insert<'lesson_agreements'>;
export type LessonGroupInsert = Insert<'lesson_groups'>;
export type LessonGroupMemberInsert = Insert<'lesson_group_members'>;
export type LessonSignupRequestInsert = Insert<'lesson_signup_requests'>;
export type LessonTypeInsert = Insert<'lesson_types'>;
export type LessonTypeOptionInsert = Insert<'lesson_type_options'>;
export type NoLessonPeriodInsert = Insert<'no_lesson_periods'>;
export type ProfileInsert = Insert<'profiles'>;
export type StudentInsert = Insert<'students'>;
export type TeacherInsert = Insert<'teachers'>;
export type TeacherAvailabilityInsert = Insert<'teacher_availability'>;
export type TeacherLessonTypeInsert = Insert<'teacher_lesson_types'>;
export type TrialLessonInsert = Insert<'trial_lessons'>;
export type UserRoleInsert = Insert<'user_roles'>;
