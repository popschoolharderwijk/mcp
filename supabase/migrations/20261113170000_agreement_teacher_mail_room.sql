-- Customized teacher agreement mails stay as stored. Only the default day-and-time line gains a room line.

UPDATE public.email_templates
SET body_markdown = replace(
	body_markdown,
	'- **Dag & tijd:** {{dag}} om {{tijd}}',
	'- **Dag & tijd:** {{dag}} om {{tijd}}' || E'\n- **Lokaal:** {{lokaal}}'
)
WHERE event_key = 'agreement_created_teacher'
	AND body_markdown NOT LIKE '%{{lokaal}}%'
	AND body_markdown LIKE '%- **Dag & tijd:** {{dag}} om {{tijd}}%';
