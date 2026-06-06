# Flowcraft

Flowcraft is a mobile-first 2D touch puzzle game. Draw glowing rails before the spring opens, route the water into the collector, collect gems, and survive increasingly strange lab layouts.

## Play Locally

```bash
python3 -m http.server 5173 --bind 0.0.0.0
```

Open:

```text
http://127.0.0.1:5173
```

If your phone is on the same Wi-Fi as the laptop, use the laptop LAN IP with port `5173`.

## Publish With GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

Once Pages is configured with `GitHub Actions` as the source, every push to `main` deploys the current game automatically.

## Files

- `index.html` - app shell
- `style.css` - responsive mobile UI
- `game.js` - canvas game logic, touch drawing, water physics, levels, gems, portals
