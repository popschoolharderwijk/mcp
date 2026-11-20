// Sets app_metadata.active_profile_id after verifying account_memberships for the caller.
// Caller must refresh the session so JWT / current_profile_id() pick up the claim.

import { handleSwitchProfileRequest } from './handler.ts';

Deno.serve(handleSwitchProfileRequest);
