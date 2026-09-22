# Floppy

A cinematic, local interaction prototype for Floppy: a physical disk collection, persistent project context, chapter navigation, decisions, notes and the next meaningful action.

Serve this directory over HTTP (ES modules require a server): `py -m http.server 8766 --bind 127.0.0.1 --directory outputs` from the workspace root. Open http://127.0.0.1:8766/index.html.

Projects, uploaded art, notes, decisions and chapter progress use local browser storage. They are device/browser-specific. Save failures and conflicting changes from other tabs are displayed. The Google key stays in the current tab and is never persisted.

The carousel supports touch scrolling, buttons and arrow keys. Continue resumes the current project step. Approve records a human decision; Needs more work leaves it unresolved. Chapter details show requirements without advancing state. Confirmed current-chapter decisions can be reopened. New ideas begin with identity, then a brief and research. Existing samples start at different stages; their prior chapters are not presented as verified.

Edit identity supports title, subtitle, context, local raster uploads and Google image/text generation. Automatic mode drafts a missing description and artwork from at least 80 characters of context when a key is present; human titles and custom artwork are preserved. Generated images are resized before storage. Generation consumes the user's Google quota. Live generation requires a valid key and has not been end-to-end tested with a real account.

This is not the complete PRD implementation: chapter steps are a condensed interaction demonstration, not full production gates. GitHub, account authentication, cloud persistence, agent handoff and deployment verification are not connected. Engineering requirements remain unconfirmed; local human decisions must not be mistaken for machine verification.
