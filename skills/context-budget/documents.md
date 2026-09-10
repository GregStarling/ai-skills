# Documents, images, screenshots and logs

These are the heaviest things that enter a session, and everything in the session is re-sent on every turn. The rule is: extract once, keep the extract, never carry the original.

## PDFs and Word documents

Never page through a document in the coordinator. Convert to text, grep for the terms that matter, read those ranges, and write down the conclusion with the page or line reference. When the whole document matters, hand it to a cheap worker with the question that needs answering and take back the answer with quoted passages and references.

By hand: `pdftotext -layout in.pdf out.txt`, `textutil -convert txt in.docx` (macOS), or `pandoc in.docx -t plain`. The optional Read hook in [hooks/](hooks/README.md) does this automatically when the tools are present.

## Spreadsheets

Do not read an .xlsx directly. Dump the sheet you need to CSV with a short script into a scratch directory, then read or query the CSV. Report numbers from the CSV, not from memory.

## Images and screenshots

Look once, write one sentence about what was seen, never re-read. Saving or deleting the image file does not remove it from the conversation.

For visual verification of a UI, run the browser steps in a worker and have it return PASS or FAIL with a one-line reason and the path to its evidence; the screenshot stays in the worker. When acceptance requires the frontier to inspect the rendering itself, inspect it once and record the finding. In the coordinator prefer page text, element lookup and DOM reads over full screenshots. Downscale large images before reading them; a 1280px-wide copy is enough to judge layout.

If the user pastes a screenshot, describe the relevant facts in the reply so they survive compaction, and do not ask for it again.

## Logs and command output

Never dump a full log. Grep for the error with line numbers, tail the last fifty lines, or count and sample. Save the full output to a file and cite the path. For a large log that needs reading end to end, a cheap worker triages it and returns the relevant lines.

## After compaction or handoff

Anything learned from a document or image survives only as the note that was written. If the note is missing, re-derive from the file on disk. Do not reconstruct document contents from memory.
