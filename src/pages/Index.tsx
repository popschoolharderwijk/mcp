const dbUrl = import.meta.env.VITE_SUPABASE_URL;

export default function Index() {
	return (
		<div>
			<h1>{dbUrl}</h1>
		</div>
	);
}
