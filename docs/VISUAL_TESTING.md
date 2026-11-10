# Shared-theme visual regression testing

The Playwright suite in `tests/visual/theme.spec.js` protects the shared dark/amber Calcite design across Planning, Operations and Settings.

## Coverage

The suite runs each page at:

- Desktop: 1280 × 900
- Mobile: Pixel 5 profile, 393 × 851 CSS pixels

It verifies:

- Committed viewport screenshots for all three application shells
- Committed desktop/mobile screenshots of the Settings theme specimen
- Shared `theme.css` token values
- Primary versus `outline-fill` button hierarchy
- Minimum visible Calcite button height
- Document and header horizontal overflow
- Mobile collapse of the Operations layer panel
- Single-column mobile layout of the Settings theme preview

ArcGIS map canvases are masked with the application background color. This keeps basemap tile updates, attribution changes and live feeds from creating false regressions while preserving the application shell, operational panels and controls in the screenshots.

## Commands

```bash
npm ci
npx playwright install chromium
npm run test:visual
```

Only update screenshots after deliberately reviewing the design change:

```bash
npm run test:visual:update
npm run test:visual
```

## CI

GitHub Actions runs unit tests on Ubuntu and visual tests on `windows-latest`, matching the committed baselines. Deployment requires both jobs to pass. On failure, the workflow uploads `playwright-report` and `test-results` artifacts containing diffs and traces.
