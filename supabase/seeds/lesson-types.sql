-- =============================================================================
-- LESSON TYPES SEED (dev / test only — not applied on production)
-- =============================================================================
-- Default catalog for mcp-dev and mcp-test. Production gets lesson types via
-- Mongo import (or manual setup), not this file.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- LESSON TYPE NAMES (reference for search/replace)
-- -----------------------------------------------------------------------------
-- guitar       = 'Gitaarles'
-- drum         = 'Drumles'
-- vocal        = 'Zangles'
-- bass         = 'Basles'
-- keyboard     = 'Keyboardles'
-- saxophone    = 'Saxofoonles'
-- dj_beats     = 'DJ / Beats'
-- band_coaching = 'Bandcoaching'
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- LESSON TYPES (no duration/frequency/price; those live in lesson_type_options)
-- -----------------------------------------------------------------------------
-- Insert all 8 lesson types if they don't exist.
-- Bandcoaching is the only group lesson (is_group_lesson = true).
-- -----------------------------------------------------------------------------
INSERT INTO public.lesson_types (name, description, icon, color, cost_center, is_group_lesson, is_active)
SELECT * FROM (VALUES
  ('Gitaarles', NULL, 'LuGuitar', '#FF9500', NULL, false, true),
  ('Drumles', NULL, 'LuDrum', '#DC2626', NULL, false, true),
  ('Zangles', 'Learn to sing', 'LuMic', '#EC4899', NULL, false, true),
  ('Basles', NULL, 'GiGuitarBassHead', '#9333EA', NULL, false, true),
  ('Keyboardles', 'Keyboard lessons', 'LuPiano', '#3B82F6', NULL, false, true),
  ('Saxofoonles', NULL, 'GiSaxophone', '#FFB8A6', NULL, false, true),
  ('DJ / Beats', NULL, 'LuHeadphones', '#F59E0B', NULL, false, true),
  ('Bandcoaching', NULL, 'HiUserGroup', '#6366F1', NULL, true, true)
) AS v(name, description, icon, color, cost_center, is_group_lesson, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.lesson_types WHERE lesson_types.name = v.name);

-- -----------------------------------------------------------------------------
-- LESSON TYPE OPTIONS
-- Not all lesson types have all 15 options (30/45/60/90/120 x weekly/biweekly/monthly).
-- - Gitaarles, Drumles, Zangles, Basles, Keyboardles, Bandcoaching: all 15 options (price = duration).
-- - Saxofoonles: 6 options (30 and 45 min only) — agreements use 30 min weekly.
-- - DJ / Beats: 3 options (45 min only, all frequencies) — agreements use 45 min monthly.
-- -----------------------------------------------------------------------------

-- Full 15 options for: Gitaarles, Drumles, Zangles, Basles, Keyboardles, Bandcoaching
INSERT INTO public.lesson_type_options (lesson_type_id, duration_minutes, frequency, price_per_lesson)
SELECT lt.id, opt.duration_minutes, opt.frequency, opt.price_per_lesson
FROM public.lesson_types lt
CROSS JOIN (
  VALUES
    (30, 'weekly'::public.lesson_frequency, 30.00),
    (30, 'biweekly'::public.lesson_frequency, 30.00),
    (30, 'monthly'::public.lesson_frequency, 30.00),
    (45, 'weekly'::public.lesson_frequency, 45.00),
    (45, 'biweekly'::public.lesson_frequency, 45.00),
    (45, 'monthly'::public.lesson_frequency, 45.00),
    (60, 'weekly'::public.lesson_frequency, 60.00),
    (60, 'biweekly'::public.lesson_frequency, 60.00),
    (60, 'monthly'::public.lesson_frequency, 60.00),
    (90, 'weekly'::public.lesson_frequency, 90.00),
    (90, 'biweekly'::public.lesson_frequency, 90.00),
    (90, 'monthly'::public.lesson_frequency, 90.00),
    (120, 'weekly'::public.lesson_frequency, 120.00),
    (120, 'biweekly'::public.lesson_frequency, 120.00),
    (120, 'monthly'::public.lesson_frequency, 120.00)
) AS opt(duration_minutes, frequency, price_per_lesson)
WHERE lt.name IN ('Gitaarles', 'Drumles', 'Zangles', 'Basles', 'Keyboardles', 'Bandcoaching')
  AND NOT EXISTS (
    SELECT 1 FROM public.lesson_type_options lto
    WHERE lto.lesson_type_id = lt.id
      AND lto.duration_minutes = opt.duration_minutes
      AND lto.frequency = opt.frequency
      AND lto.price_per_lesson = opt.price_per_lesson
  );

-- Saxofoonles: only 30 and 45 min (6 options) — agreements use 30 min weekly
INSERT INTO public.lesson_type_options (lesson_type_id, duration_minutes, frequency, price_per_lesson)
SELECT lt.id, opt.duration_minutes, opt.frequency, opt.price_per_lesson
FROM public.lesson_types lt
CROSS JOIN (
  VALUES
    (30, 'weekly'::public.lesson_frequency, 30.00),
    (30, 'biweekly'::public.lesson_frequency, 30.00),
    (30, 'monthly'::public.lesson_frequency, 30.00),
    (45, 'weekly'::public.lesson_frequency, 45.00),
    (45, 'biweekly'::public.lesson_frequency, 45.00),
    (45, 'monthly'::public.lesson_frequency, 45.00)
) AS opt(duration_minutes, frequency, price_per_lesson)
WHERE lt.name = 'Saxofoonles'
  AND NOT EXISTS (
    SELECT 1 FROM public.lesson_type_options lto
    WHERE lto.lesson_type_id = lt.id
      AND lto.duration_minutes = opt.duration_minutes
      AND lto.frequency = opt.frequency
      AND lto.price_per_lesson = opt.price_per_lesson
  );

-- DJ / Beats: only 45 min, all 3 frequencies (3 options) — agreements use 45 min monthly
INSERT INTO public.lesson_type_options (lesson_type_id, duration_minutes, frequency, price_per_lesson)
SELECT lt.id, opt.duration_minutes, opt.frequency, opt.price_per_lesson
FROM public.lesson_types lt
CROSS JOIN (
  VALUES
    (45, 'weekly'::public.lesson_frequency, 45.00),
    (45, 'biweekly'::public.lesson_frequency, 45.00),
    (45, 'monthly'::public.lesson_frequency, 45.00)
) AS opt(duration_minutes, frequency, price_per_lesson)
WHERE lt.name = 'DJ / Beats'
  AND NOT EXISTS (
    SELECT 1 FROM public.lesson_type_options lto
    WHERE lto.lesson_type_id = lt.id
      AND lto.duration_minutes = opt.duration_minutes
      AND lto.frequency = opt.frequency
      AND lto.price_per_lesson = opt.price_per_lesson
  );

-- Default rates for weekly/biweekly lesson_type_options (from stripe_billing migration).
UPDATE public.lesson_type_options
SET price_per_lesson_under_21_cents = 1950,
    price_per_lesson_adult_cents = 2360
WHERE frequency = 'weekly'
  AND price_per_lesson_under_21_cents IS NULL;

UPDATE public.lesson_type_options
SET price_per_lesson_under_21_cents = 2055,
    price_per_lesson_adult_cents = 2498
WHERE frequency = 'biweekly'
  AND price_per_lesson_under_21_cents IS NULL;
