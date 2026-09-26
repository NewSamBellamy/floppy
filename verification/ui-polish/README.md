# UI/UX polish verification — 2026-09-24

This pass preserves the existing Floppy product and data model. It improves task/action hierarchy, dialog consistency, mobile chapter visibility, keyboard controls, and long-content behavior.

All testing used fresh, isolated Chromium contexts. Gemini traffic was mocked; no real user key or project data was accessed.

## Evidence

- `floppy-polish-after-journey.json`: 132 captured states, measured browser/document sizes, primary-action rectangles, active chapter/rail rectangles, and console output from the fresh Fieldnotes journey through all 13 chapters and Prototype.
- `floppy-polish-after.json`: 35 measured picker, Idea, Settings, Project Art, Problem, evidence, and source-detail states from the existing visual audit.
- PNG filenames include before/after, the actual viewport, and the screen. The selected comparisons cover home, Idea, investigation, art, and mobile chapter navigation. Additional after screenshots cover every required desktop size plus 1280×720 and 390×844.

The journey's sole HTTP 503 error is an intentional failure response to verify recovery. Fresh visual and controls audits have no console errors. Repeated errors in visual JSON would be cumulative per viewport, not independent occurrences; the final arrays are empty.

## Results

| Actual viewport | Page overflow | Primary actions | Current chapter | Long-text reload |
| --- | --- | --- | --- | --- |
| 1366×768 | None | Visible | Visible | Exact restore |
| 1440×900 | None | Visible | Visible | Exact restore |
| 1920×1080 | None | Visible | Visible | Exact restore |
| 1280×720 | None | Visible | Visible | Exact restore |
| 390×844 | None | Visible | Rail follows active chapter | Exact restore |

Long answers and source/brief regions scroll internally. The narrow art dialog keeps approval/cancel fixed while its editor content scrolls. Expanded research may make the workspace region scroll; it never makes the document scroll.

## Reproduce

Serve the repository over HTTP. Use an installed Playwright package and Chromium; set `PLAYWRIGHT_MODULE` to the package path if it is outside normal Node resolution. Set `FLOPPY_URL` to the served `index.html` (these two new scripts default to port 8766). Then run:

```text
node --test
node polish-journey.cjs
node polish-controls.cjs
node milestone1.browser.cjs
node milestone2.browser.cjs
node milestone3-visual-audit.cjs
node milestone4-reliability-audit.cjs
node milestone5-accessibility-audit.cjs
```

The new journey writes screenshots and JSON to the OS temporary directory. `FLOPPY_AUDIT_TAG` changes their prefix; the default is `polish-after`. The controls audit also verifies keyboard file choosers, menu bounds/Escape, masked Settings, named dialogs, exact long-Idea persistence, and document dimensions under reduced motion.

Live Gemini service behavior and generation quality are outside this local polish verification. The AI, art geometry, chapter state, and storage modules were not changed.
