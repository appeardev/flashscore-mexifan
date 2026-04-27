# flashscore-mexifan

Fork de [gustavofariaa/FlashscoreScraping](https://github.com/gustavofariaa/FlashscoreScraping) adaptado para Liga MX, con extractor de **alineaciones titulares + banca + técnicos** (lo que la versión original no extraía).

## Por qué este fork

El scraper original captura resultados, estadísticas y meta-info de partidos, pero **no** las alineaciones ni la banca. Esa información es la que alimenta el análisis de patrones de DT (quién manda banca, quién es titular fijo) que se usa para fantasy de Liga MX (Mexifan).

## Lo que agrega

- `src/scraper/services/lineups/index.js` — extrae XI titular, banca, jugadores ausentes/lesionados, técnicos y formación táctica desde `/summary/lineups/?mid=…`.
- `src/liga-mx.js` — script no-interactivo que recorre `results` + `fixtures` de Liga MX y guarda todo en `data/liga-mx/clausura-2026-YYYY-MM-DD.json` y `data/liga-mx/latest.json`.
- `src/scraper/index.js` — helper `dismissConsent()` para el banner OneTrust de cookies.
- `package.json` — scripts `scrape:liga-mx` y `scrape:liga-mx:lineups`.

## Uso

```bash
npm install
npx playwright install chromium
npm run scrape:liga-mx
```

Salida (un objeto por partido):

```json
{
  "joJF1PBk": {
    "id": "joJF1PBk",
    "url": "https://www.flashscore.com/match/football/cruz-azul-G8PFBMll/necaxa-nw32pOQD/?mid=joJF1PBk",
    "home": "Cruz Azul",
    "away": "Necaxa",
    "lineups": {
      "available": true,
      "formation": { "home": "4 - 2 - 3 - 1", "away": "3 - 4 - 3" },
      "starting": {
        "home": [{ "num": "23", "name": "Mier K.", "role": "G" }, ...],
        "away": [{ "num": "22", "name": "Unsain E.", "role": "G" }, ...]
      },
      "substitutes": {
        "home": [{ "num": "10", "name": "Montano A." }, ...],
        "away": [{ "num": "26", "name": "Lara E." }, ...]
      },
      "missing": { "home": [...], "away": [...] },
      "coaches": {
        "home": [{ "name": "Huiqui J." }],
        "away": [{ "name": "Varini M." }]
      }
    }
  }
}
```

## Flags

- `--lineups-only` — saltar la extracción de stats del partido (más rápido, solo alineaciones)
- `--results-only` — solo partidos jugados, no fixtures futuros
- `CONCURRENCY=N npm run scrape:liga-mx` — partidos en paralelo (default 3)

## Por qué Flashscore y no SofaScore / Understat

- Flashscore sí publica alineaciones titulares + banca + DT por partido. SofaScore y Understat tienen mejores stats avanzadas (xG, key passes) pero no la banca.
- El bloqueo anti-bot existe (Cloudflare + OneTrust consent) pero es manejable con stealth básico (UA real + dismiss del banner).
