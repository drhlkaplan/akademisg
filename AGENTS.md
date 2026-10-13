# Architecture rules
- Store firm sector selections in `firms.sector_ids`, with `sector_id` synchronized to the first selection for backward-compatible training matching; validate sector references on writes.
- Use the shared certificate PDF renderer for template previews and downloads so signature headings and placement stay consistent.
- Store certificate signatories (İSG uzmanı, işyeri hekimi, işveren vekili) in `certificate_trainers`; templates copy the chosen person's name/title into their own fields so issued certificates stay stable if a trainer record changes.
- Launch SCORM packages through the `/scorm-proxy/` service worker (`public/scorm-sw.js`) and prefer LMS launch pages (`index_lms*.html`) over `story.html`; CDN-origin frames cannot reach `window.API`, so tracking, completion and resume only work same-origin.
