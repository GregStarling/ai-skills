# Focus

## Complete the Request. Then Stop.

An agent can turn a small task into a refactor, a bug hunt, and a list of new
decisions. Focus keeps execution within the user's request while preserving the
quality and checks needed to make the result correct, safe, and usable.

Adjacent findings stay brief notes for the user to consider. Necessary scope
expansions get a one-line explanation. Reasonable assumptions keep work moving;
material uncertainty gets a focused question or a clear blocker.

Plan requests produce plans. Analysis and recommendations retain depth,
relevant alternatives, and thoughtful pushback. Verification follows risk,
and valid checks are reused when the work they cover has not changed.

## Install and use

```sh
npx skills add GregStarling/ai-skills --skill focus --agent codex claude-code --copy
```

Run from your project; add `--global` for personal installation. Or copy this
complete folder into your agent's skill directory. Focus is instructions only
and needs no build or runtime helper.

- Codex: `$focus Add a CSV export button to the reports page.`
- Claude Code: `/focus Update the onboarding document for the new setup flow.`
- Plan only: “Use Focus to plan the migration. Do not start implementing it.”
- Natural language: “Stay on task. Complete this edit and stop.”

## Composition

Focus bounds the work while other skills provide their relevant procedures.
Delegate can supply routing and required independent review; Debug can prove a
correction; CTO or Checklist can track the requested outcome; Ship can complete
an authorized release. Their checks still apply within that outcome. No
companion skill is required, and Focus adds no tracking files or permissions.

[Canonical instructions](SKILL.md)
