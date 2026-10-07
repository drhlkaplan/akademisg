# Architecture rules
- Store firm sector selections in `firms.sector_ids`, with `sector_id` synchronized to the first selection for backward-compatible training matching; validate sector references on writes.
- Use the shared certificate PDF renderer for template previews and downloads so signature headings and placement stay consistent.- Store certificate signatories (İSG uzmanı, işyeri hekimi, işveren vekili) in `certificate_trainers`; templates copy the chosen person's name/title into their own fields so issued certificates stay stable if a trainer record changes.
