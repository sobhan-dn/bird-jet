# Bird Jet

A mobile-first arcade web game where the player switches between a combo-jumping bird and a free-flight jet.

## Play

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Controls

- `Space` or the `بال` button: flap as bird, boost as jet
- `E` or the `جت` button: switch between bird and jet
- `R` or the `شلیک` button: fire
- `WASD` / arrow keys: steer the jet
- Touch-drag on the game canvas: steer the jet on mobile

## Publishing

This repo includes a GitHub Pages workflow. Every push to `main` builds the game with Vite and publishes the static site from `dist`.

In GitHub, enable Pages with:

- Source: `GitHub Actions`

Then push to `main`. Your friend can publish updates by pulling, editing, committing, and pushing.

## Persian Summary

این بازی برای موبایل طراحی شده: در حالت پرنده با بال زدن combo و پرش بیشتر می‌گیری، در حالت جت آزادانه عقب/جلو/بالا/پایین می‌روی. با `E` حالت عوض می‌شود و با `R` تیر می‌زنی. هر push روی `main` می‌تواند مستقیم با GitHub Actions منتشر شود.
