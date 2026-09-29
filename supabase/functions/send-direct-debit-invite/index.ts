// Sends a Magic Link to the student (or their representative)
// with a redirect to /direct-debit/start?agreement=<id>. After logging in,
// the user can proceed directly to Stripe checkout.
//
// Auth required. Allowed: privileged staff (admin/teacher) or the student themselves.
// For a minor student (date_of_birth -> <18 now), the email is sent to
// `parent_email` if present, otherwise to the student account.
import { serveLessonAgreementPost } from '../_shared/http-serve.ts';
import { handleSendDirectDebitInvite } from './handler.ts';

serveLessonAgreementPost(handleSendDirectDebitInvite);
