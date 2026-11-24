// Public: confirm signup email token (single-use). verify_jwt = false in config.toml.

import { handleConfirmSignupRequest } from './handler.ts';

Deno.serve(handleConfirmSignupRequest);
