# tests/

Playwright-driven regression & balance scripts. They drive the **real** game loop
(they load `index.html` in headless Edge and poke the live globals) — no mocks.

```bash
# Playwright is expected at the path baked into each script; adjust require() if yours differs
node smoke.js            # boot + no console errors
node balance_test.js     # 5 player archetypes x 365 days, prints the economy audit
node verify_cam.js       # the cinematic camera pull plays exactly once per session
node verify_r65.js       # junction roulette + autosave + tutorial + mobile + legal
node store_test.js       # in-game collectibles store
node loan_test.js        # good/bad debt lifecycle
node probe_on_street.js  # NOTHING BUILT IN A ROADWAY: every building, landmark,
                         # set piece and wedge lawn vs the paved corridors
node probe_estate.js     # ESTATE: works capitalised at 24 months, canvas sold for
                         # cash, possessions excluded, HUD == page, 390px phone
node book_test.js / eat_test.js / night_test.js / perf_test.js ...
```

`make_route_*.js` are the one-off generators used to design the walkable street
route; kept for history, not part of CI.
