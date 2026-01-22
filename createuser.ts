import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_DEFAULT_KEY = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
	throw new Error('Missing credentials');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_DEFAULT_KEY);

const { data, error } = await supabase.auth.signUp({
	email: 'test@test.nl',
	password: 'password',
	options: {
		data: {
			display_name: 'Testy McTestface',
		},
	},
});

if (error) {
	console.error('Error:', error.message);
} else {
	console.log('User created:', data.user?.id);
}
