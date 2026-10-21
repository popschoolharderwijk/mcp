import { serveLessonAgreementPost } from '../_shared/http-serve.ts';
import { handleSendAgreementConfirmation } from './handler.ts';

serveLessonAgreementPost(handleSendAgreementConfirmation);
