CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule(
  'stripe-billing-daily',
  '0 3 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://zdvscmogkfyddnnxzkdu.supabase.co/functions/v1/stripe-billing-daily',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret.decrypted_secret),
    body := '{}'::jsonb
  ) AS request_id
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'CRON_SECRET' AND length(secret.decrypted_secret) > 0;
  $job$
);