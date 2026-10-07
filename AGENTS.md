# Architecture rules
- Store firm sector selections in `firms.sector_ids`, with `sector_id` synchronized to the first selection for backward-compatible training matching; validate sector references on writes.
- Use the shared certificate PDF renderer for template previews and downloads so signature headings and placement stay consistent.