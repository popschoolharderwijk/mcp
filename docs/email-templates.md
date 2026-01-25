# Email Templates Configuratie

De `email-templates` map bevat de email templates die in Supabase moeten worden ingesteld.

## Waar instellen in Supabase Dashboard

1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecteer je project (dev of prod)
3. Navigeer naar: **Authentication** → **Email**
4. Klik op **Magic Link**

## Template instellen

### Subject (onderwerp)
```
Je inloglink
```

### Body (HTML)
Kopieer de volledige inhoud van `magic-link.html` in dit mapje en plak deze in het "Body" veld.

## Beschikbare variabelen

| Variabele | Beschrijving |
|-----------|--------------|
| `{{ .ConfirmationURL }}` | De volledige Magic Link URL |
| `{{ .Token }}` | De OTP code |
| `{{ .TokenHash }}` | Hash van de token (voor URLs) |
| `{{ .SiteURL }}` | Je geconfigureerde Site URL |
| `{{ .Email }}` | Het emailadres van de gebruiker |

## Belangrijk: Doe dit voor BEIDE omgevingen

- **Development**: `zdvscmogkfyddnnxzkdu`
- **Production**: `bnagepkxryauifzyoxgo`

---

## Custom SMTP (Resend)

We gebruiken [Resend](https://resend.com) als custom SMTP provider voor betrouwbare email delivery.

### SMTP Settings configureren

Ga naar **Authentication** → **Emails** → **SMTP Settings**:

| Veld | Waarde |
|------|--------|
| Enable Custom SMTP | ✅ |
| Sender email | `noreply@popschoolharderwijk.nl` |
| Sender name | `Popschool Harderwijk` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | *API key uit Resend dashboard* |

### Resend Setup

1. Maak een account aan op [resend.com](https://resend.com)
2. Ga naar **Settings** → **API Keys** en maak een nieuwe API key aan
3. Ga naar **Settings** → **Domains** en verifieer je domein (DNS records toevoegen)

> ⚠️ **Let op**: De sender email moet een geverifieerd domein zijn in Resend.
> Voor development kun je `xxx@resend.dev` gebruiken.
