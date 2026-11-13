-- =============================================================================
-- ROOMS SEED (dev / test only — not applied on production)
-- =============================================================================
-- Catalog copied from the public room list. Descriptions and notes stay empty.
-- image_url points at the public reservation bucket; files stay there.
-- =============================================================================

INSERT INTO public.rooms (id, name, color, visibility, is_active, max_capacity, facilities, image_url)
VALUES
	(
		'1d5f42f5-fa74-4b15-95f2-5657abb891e9',
		'doneer ruimte',
		'#cccccc',
		'public',
		true,
		10,
		ARRAY['Versterker', 'Microfoon'],
		NULL
	),
	(
		'707ee156-f622-450f-8c57-413177cc9cb4',
		'Drumlokaal',
		'#ffdd00',
		'public',
		true,
		10,
		ARRAY[
			'2x Shure SM58',
			'Soundcraft EFX8 Mixer',
			'2x Mackie SRM350 Speakers',
			'Yamaha P95 Digitale piano',
			'Eden EN700 Basversterker',
			'Marshall Valvestate Gitaarversterker',
			'4x Lessenaar',
			'2x Ludwig Element Drumkit (inclusief hardware)',
			'Tama Stagestar Drumkit (inclusief hardware)'
		],
		'https://ubsajgkldbjvdczrdjsh.supabase.co/storage/v1/object/public/room-images/707ee156-f622-450f-8c57-413177cc9cb4/1764066804490.png'
	),
	(
		'483682b6-ce71-4114-86b9-6fc00d168863',
		'Oefenruimte',
		'#f5ffc2',
		'public',
		true,
		10,
		ARRAY[
			'4x Shure SM58',
			'Soundcraft EFX8 Mixer',
			'2x Mackie SRM450 Mixer',
			'Ludwig Element Drumkit (inclusief hardware)',
			'Yamaha P95 Digitale piano',
			'Genz Benz Neopak Basversterker',
			'Marshall Valvestate Gitaarversterker'
		],
		'https://ubsajgkldbjvdczrdjsh.supabase.co/storage/v1/object/public/room-images/483682b6-ce71-4114-86b9-6fc00d168863/1764066926989.png'
	),
	(
		'e2dabeaf-addc-46b4-8fc9-c8303a69ee02',
		'Opnameruimte',
		'#00eeff',
		'public',
		true,
		10,
		ARRAY[
			'Akoestische piano',
			'Yamaha P45 Digitale piano',
			'Soundcraft EFX8 Mixer',
			'2x Mackie SRM350 Speakers',
			'4x Shure SM58',
			'London City Sherman 300 Basversterker',
			'Orange Rockerverb 50 gitaarversterker',
			'Blackstar 2x12 Gitaarcabinet',
			'Kitty Hawk 4x12 Gitaarcabinet',
			'Ludwig Centennial Drumkit (inclusief hardware)',
			'2x Eden E15 Basversterker',
			'Bogner 2x12 Gitaarcabinet',
			'2x12 Gitaarcabinet',
			'2x Hartke Hydrive 410 Bascabinet',
			'2x lessenaar'
		],
		'https://ubsajgkldbjvdczrdjsh.supabase.co/storage/v1/object/public/room-images/e2dabeaf-addc-46b4-8fc9-c8303a69ee02/1764066979208.png'
	),
	(
		'c51a6a77-d513-44ca-8404-074b365ea50a',
		'Productieruimte',
		'#ff0000',
		'public',
		true,
		10,
		ARRAY[
			'Yamaha P45 Digitale piano',
			'4x KRK Rokit 5 Studiomonitoren',
			'2x Mackie SRM350 Speakers',
			'Soundcraft EFX8 Mixer',
			'2x Shure SM58',
			'Pioneer XDJ-XZ Draaitafel'
		],
		'https://ubsajgkldbjvdczrdjsh.supabase.co/storage/v1/object/public/room-images/c51a6a77-d513-44ca-8404-074b365ea50a/1764067063660.png'
	),
	(
		'7fb2f1c0-3588-4722-bc4b-b0ccd259bd01',
		'Studio',
		'#ff9500',
		'public',
		true,
		10,
		ARRAY[
			'Argosy C24 Mixer',
			'2x KRK Rokit 7 Studiomonitoren',
			'2x Avantone Mixcube Studiomonitoren',
			'2x Focal Twin 6 BE Studiomonitoren',
			'Universal Audio X8P Interface',
			'Arturia keylab 88 Midi keyboard',
			'Nord Stage Revision B Digitale piano'
		],
		'https://ubsajgkldbjvdczrdjsh.supabase.co/storage/v1/object/public/room-images/7fb2f1c0-3588-4722-bc4b-b0ccd259bd01/1764067114632.png'
	)
ON CONFLICT (id) DO NOTHING;
