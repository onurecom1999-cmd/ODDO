# ODDO – One Day or Day One

Fitness app built around a 12-week pact with a crew of 4–6 people. Finish 80% of your sessions and your next pact is free.

## Landing page

`landing/index.html` is a single static page (German, Turkish, English) with a waitlist form.

- Open it locally by double-clicking the file.
- Hosting: Netlify, with `landing` as the publish directory (see `netlify.toml`).
- Sign-ups: the pact form uses Netlify Forms. Signed pacts (first name, email, language) show up in the Netlify dashboard under Forms → pact.

## App (`app/`)

Erste ODDO-App (Expo, React Native, TypeScript). Daten bleiben vorerst lokal auf dem Gerät.

- `npm install` und dann `npx expo start` im Ordner `app/` (Expo Go auf dem Handy scannen)
- Web-Testversion als eine Datei: `npx expo export --platform web && python3 scripts/build-web-single.py oddo.html`

## Server (Supabase)

Logins, Crews und Trainings liegen in Supabase. Einmalig einrichten:

1. Projekt anlegen (Region Frankfurt) und anonyme Anmeldung einschalten (Authentication → Sign In / Providers).
2. `supabase/schema.sql` im SQL Editor ausführen.
3. Projekt-URL und anon key in `app/.env` als `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` eintragen. Beide sind öffentlich, die Daten schützt Row Level Security.

Ohne diese Werte läuft die App offline mit einer Beispiel-Crew.

## Hosting (Netlify)

`scripts/build-site.sh` baut die Landingpage nach `site/` und die Web-App nach `site/app/`, `netlify.toml` ruft das Skript auf. Tester öffnen `/app/` auf dem Handy und legen die App auf den Startbildschirm.
