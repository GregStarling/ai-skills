# Install skills

CTO and Delegate are independent consumer skills. Install either or both. Copy the
complete folder, including references, metadata and any scripts. Neither needs
the repository's build or Model Governor engine. Delegate's helper needs Node.js;
CTO has no runtime dependency. refresh-models is a repository maintenance workflow,
not a standalone consumer skill.

## Skills CLI

From the project where you use your agent:

```sh
npx skills add GregStarling/ai-skills --skill cto delegate --agent codex claude-code --copy
```

Choose one skill or one agent by omitting the other name. Add `--global` for a
personal install. The CLI's `--list` option lists skills without installing.
`--copy` installs complete copies rather than links into the source checkout.
See the [CLI documentation](https://github.com/vercel-labs/skills) for other agents.

## Manual install

Clone once:

```sh
git clone https://github.com/GregStarling/ai-skills.git
cd ai-skills
```

For a fresh personal CTO install in Codex:

```sh
mkdir -p ~/.agents/skills
test ! -e ~/.agents/skills/cto && test ! -L ~/.agents/skills/cto && cp -R skills/cto ~/.agents/skills/cto
```

For a fresh personal CTO install in Claude Code:

```sh
mkdir -p ~/.claude/skills
test ! -e ~/.claude/skills/cto && test ! -L ~/.claude/skills/cto && cp -R skills/cto ~/.claude/skills/cto
```

Replace each `cto` with `delegate` for Delegate. The guards refuse an existing
file, folder or symlink; use the update procedure below instead of nesting a new
copy inside an old installation.

For project scope, use `<your-project>/.agents/skills/<name>` for Codex or
`<your-project>/.claude/skills/<name>` for Claude Code. Do not install into this
library checkout: its `skills/` source stays inert.

## Invoke and check discovery

Start a fresh session. Use `$cto` or `$delegate` in Codex; `/cto` or `/delegate` in
Claude Code. Codex also exposes skills through its skill selector. Keep Claude
project settings enabled for project-scope discovery. A personal Claude skill
with the same name takes precedence over a project copy; update or remove the
personal copy when switching versions ([host precedence rules](https://code.claude.com/docs/en/skills#resolve-skills-that-share-a-name)).

The shared SKILL.md is authoritative for either host; optional metadata does not
create a separate behavioral implementation. Each skill's own README explains
its triggers and composition with other skills.

## Update or remove

For CLI-managed installs, use `npx skills update` and `npx skills remove` as
appropriate for the installation scope; consult their help for targeting agents.
For manual installs, pull the repository, move the entire old installed folder
to a backup outside any skill-discovery directory, then copy the new complete
folder. Do not merge old and new files. Local edits belong in your backup.

To remove a manual install, remove only that installed skill folder or link.
Removing CTO does not delete a project's execution ledger.

[Delegate maintainer activation and measurement notes](delegate-install.md)
