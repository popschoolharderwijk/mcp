// Create or link a student for privileged staff/admin.
// Auth users are created server-side. The students row is created via
// ensure_student_exists (same helper as the lesson_agreements insert trigger),
// then parent/debtor fields are applied with an update.

import { handleCreateStudentRequest } from './handler.ts';

Deno.serve(handleCreateStudentRequest);
