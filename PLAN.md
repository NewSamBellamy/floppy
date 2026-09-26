# Floppy internal MVP finish plan

Use `GOAL.md` as the finish line, `IMPLEMENT.md` as the execution loop, and `STATUS.md` as the live record. Complete milestones in order; record a checkpoint only after its acceptance journey passes.

## 1. Restore baseline and finish Phase 1 logic

**Objective:** Make the current branch runnable, then make each chapter a coherent proposed-understanding → optional investigation → human-confirmation flow.

**Scope:** Audit the dirty diff against `a8d34a7` and the saved source backup. Resolve the missing `wireChapterDetails` call and the eight current regression failures. Review `app.js`, `chapter-intelligence.mjs`, `chapter-investigation.mjs`, and their tests for all 13 chapters; preserve source, proposal, research synthesis, draft, and confirmed value separately. Ensure previous confirmed context and relevant sources carry forward, with bounded prompts that do not silently drop the current decision. Make Readiness and unlocked phase navigation reachable. Recover interrupted AI work after reload.

**Keep:** Existing lifecycle, chapter order, local project format, human confirmation, and investigation as a temporary workspace state.

**Accept/verify:** Project opens without a browser error. `node --test` passes. In an isolated profile, create and reopen a project; Idea, Problem, Audience, all later chapters, Idea Brief, and Readiness can each be reviewed and confirmed in order. Each chapter has a useful investigation brief, return path, and clear next action. Revisit earlier chapters and verify source/synthesis/confirmed values stay distinct. Refresh during an in-flight mocked request; it must recover rather than show endless loading.

**Stop for human input:** Only if a required chapter outcome contradicts the current product definition and cannot be resolved from `GOAL.md` or current behavior.

## 2. Finish project art

**Objective:** Make art selection predictable from prompt to saved disk.

**Scope:** Reconcile the uncommitted `project-art.mjs`, `app.js`, `identity.js`, and CSS work. Use project context sparingly; accept uploaded/current/project reference images; generate a candidate; drag/zoom/reset the exact floppy crop; commit only with Use image. Preserve originals on cancel, errors, and failed storage. Keep one art record and shared crop geometry.

**Keep:** Disk component, carousel selection, existing project identity, and explicit candidate approval. Avoid a second art workflow.

**Accept/verify:** With mocked API output, upload, reference, prompt, regenerate, crop, cancel, approve, reload, and compare editor preview to carousel pixels. Check generated image constraints and failure state. Live Gemini generation requires a user-provided working key and is recorded as unverified until actually tested.

**Stop for human input:** Missing key for live sign-off, or a genuine choice about whether art metadata should persist without approving an image.

## 3. Sharpen the current experience

**Objective:** Make the active question, current answer, and decision visually unmistakable.

**Scope:** Inspect the picker, compact project header, lifecycle, chapter rail, chapter modes, details, Settings, art dialog, and copy. Remove duplicated helper text and unnecessary controls. Use progressive disclosure for evidence and uncertainty. Consolidate CSS rules where overrides conflict. Keep motion brief and functional.

**Keep:** Dark cinematic direction, floppy metaphor, fixed shell, carousel input methods, and existing navigation model.

**Accept/verify:** The selected disk and Continue action are clear; chapters show one dominant question/action; secondary information opens without clutter; dialogs read well. Compare screenshots before/after at the required viewports and inspect the diff for unintended product changes.

**Stop for human input:** Only if two substantially different visual directions both fit the brief and choosing one would replace the established style.

## 4. Reliability and data trust

**Objective:** Make saved work and failures predictable.

**Scope:** Audit localStorage migration/versioning, autosave timing, tab conflicts, quotas, malformed saved state, attachments, cancellation, stale AI responses, and API errors. Ensure project creation can retain context added before creation. Settings should mask the key, show an actionable error, and return to the initiating flow. Never present an unsaved value as saved.

**Keep:** Local-first internal MVP storage and user-controlled Gemini connection. No cloud backend.

**Accept/verify:** Type and refresh at debounce boundaries; attach/remove text, PDF, image, and link; reopen projects; interrupt generation; simulate quota and network errors. Existing confirmed decisions and art survive every failure. Run tests and a fresh browser console audit.

**Stop for human input:** Destructive migration or data repair requiring a choice about user-owned records.

## 5. Responsive and accessible controls

**Objective:** Keep the same experience usable across laptop, desktop, and narrow screens.

**Scope:** Test home, chapters, investigation, Settings, and art dialog at 1366×768, 1440×900, 1920×1080, 1280×720, and one narrow viewport. Check keyboard carousel, rail, crop, attachment removal, modal focus/Escape, contrast, labels, and action visibility.

**Keep:** Fixed desktop shell and internal scrolling in rail/detail regions. Narrow layout may stack or use horizontal navigation.

**Accept/verify:** Record actual browser viewport dimensions and screenshots. No unexpected document scroll, clipped primary action, hidden dialog control, focus loss, or browser console error. Where content is long, only intended subregions scroll.

**Stop for human input:** Only if supporting a specific older device/browser would require changing the agreed internal MVP target.

## 6. End-to-end finish audit

**Objective:** Verify the product without builder guidance and establish a stable handoff.

**Scope:** Use a fresh isolated project such as Clydeo. Create with context, form a Working Idea, complete all 13 chapters, investigate Problem, add returned research, review synthesis, edit and approve art, refresh and reopen, then revisit previous decisions. Exercise failure paths and Settings without exposing credentials. Reconcile `README.md` with the actual app and update `STATUS.md`.

**Keep:** Scope in `GOAL.md`; do not add public infrastructure or unrelated features to pass this audit.

**Accept/verify:** Complete the journey, unit tests, syntax checks, required viewport screenshots, console audit, source/crop/persistence checks, and diff review. Record any live API item that could not be tested. Commit a stable checkpoint with a clear hash and no unrelated backup files.

**Stop for human input:** A missing live credential or external service failure after all local and mocked checks are complete, or an unresolved product choice that materially changes the experience.
