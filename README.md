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
