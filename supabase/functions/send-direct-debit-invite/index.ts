// Sends the own "direct_debit_invite" template e-mail (with a server-generated login link)
// with a redirect to /direct-debit/start?agreement=<id>. After logging in,
// the user can proceed directly to Stripe checkout.
//
// Auth required. Allowed: privileged staff (admin/teacher) or the student themselves.
// The e-mail goes to the e-mail address of the student account (the login account);
// the greeting uses the parent or debtor name when known.
import { serveLessonAgreementPost } from '../_shared/http-serve.ts';
import { handleSendDirectDebitInvite } from './handler.ts';

serveLessonAgreementPost(handleSendDirectDebitInvite);
