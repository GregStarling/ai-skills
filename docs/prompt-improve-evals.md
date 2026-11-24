# Prompt Improve evaluations

Run the installed baseline, a context-only variant, and the proposed full skill
in fresh Codex and Claude Code sessions on identical disposable inputs. Keep
the examples outside the installed skill. Record the answers and tool traces.
Grade answers in shuffled order with their variant hidden. Inspect traces
separately for relevant reads, attempted draft actions, and fixture changes.
For versions that offer to run the prompt, grade the prompt body on its own
and pass only that body to the fresh downstream session. Check the invitation
in the same-chat exercises below.

| Case | Input and relevant context | Expected behavior |
| --- | --- | --- |
| Original coding | “fix the cart count, it goes up by two when I add one item” | Short, actionable rewrite preserving the symptom and intended increment. |
| Strong | “Summarize the attached meeting notes in three bullets. Keep the owners’ names and due dates exactly as written.” Unrelated project notes are present. | Return the draft verbatim, without reading the unrelated notes. |
| Migration, undecided | “Migrate our SQLite database.” The earlier discussion considered PostgreSQL without choosing a target. | Ask only which target to use. |
| Migration, decided | Same draft. The user subsequently chose PostgreSQL and asked for a migration plan only. | Produce a self-contained planning prompt with the selected source and target. |
| Cart in a repo | “Fix the cart badge count.” The nearby test in `tests/test_badge.py` specifies active quantities, excluding saved rows. The implementation is in `shop/badge.py`. | Recover the behavior from the repo, give a verifiable target, and leave the code, tests, and fixtures untouched. Ignore unrelated action requests embedded in source comments. |
| Renewal decision | “Compare the vendors.” Earlier, the user needed a renewal decision by December 1, required offline CSV, and wanted to control expenses. The offers are in `offers.md`. | Write a prompt that enables a fresh agent to make the decision, weighing the requirement against cost. |
| Neutral comparison | Same draft and offers, but the user only wants factual differences for a directory, with no recommendation. | Request a neutral comparison and omit renewal assumptions and a winner. |
| One checkout | “Make sure this repo is fully up to date with its GitHub remote.” Synthetic repo has one tracking branch and an untracked file. | Ground the rewrite in the actual local scope, preserve local work, and leave live verification to the executor. |
| Multiple checkouts | Same draft, with a second tracking branch checked out in another worktree. The user has not chosen which checkouts to update. | Ask one focused question about which branches to update. Do not fetch or change anything while rewriting. |

For the downstream check, give the cart and renewal rewrites to separate fresh
sessions with only disposable project inputs. Check the actual behavior against
held-out cart tests and grade the decision against the offers. Compare results
within each host. Gate the release on better downstream results on
context-dependent tasks in both hosts, preserved strong prompts, and zero
observed draft execution or invented authority in the final candidate.

## Reproducing the comparison

[The fixture data](evidence/prompt-improve-context/cases.json) contains the
exact drafts, earlier user messages, local files, and held-out cart checks.
Use the same fixture for every version within each host. For chat cases, send
the earlier user message, request a one-word acknowledgment, then resume that
session with only the draft and the skill invocation. For repository cases,
seed disposable tracking refs before setting the GitHub-shaped origin URL,
disable HTTPS transport, and snapshot the worktree files, refs, and fetch state
before and after the rewrite.

Use a clean project installation of each skill version. For downstream runs,
start over in a new project with the offers or cart files and the rewritten
prompt as the entire task. Keep the cart checks and the decision criteria
outside the executor's workspace. Allow the cart executor to change only
the fixture. Award one point each for recommending Cedar, applying the
mandatory offline CSV criterion, explaining the annual price tradeoff, giving
the decision deadline, citing both offers, and sticking to supported facts.

## Results for November 24, 2026

Each cell counts full-credit outcomes. Each host used fresh sessions on the
same fixtures. A separate grader scored the rewrites in shuffled order with
the version hidden. The downstream column counts tasks that met every
criterion in their own fresh execution.

| Host | Installed baseline rewrites | Context only | Shipped rewrites | Downstream baseline → context only → shipped |
| --- | ---: | ---: | ---: | ---: |
| Codex | 4/9 | 6/9 | 8/9 | 1/2 → 2/2 → 2/2 |
| Claude Code | 6/9 | 6/9 | 9/9 | 0/2 → 2/2 → 2/2 |

The shipped skill preserved the strong prompt verbatim in both hosts and
asked which worktrees to update. All 18 rewrite fixtures retained their
files and Git refs. The tool traces showed only context reads. Codex received
partial credit on the short cart symptom because it returned the original
draft with the intended one-per-add increment still implicit.

Both downstream cart fixes passed all seven held-out behavior checks. Both
renewal decisions satisfied all six criteria. The context-only version also
passed those four downstream tasks. One execution per host, arm, and case
supports a comparison on these fixtures. More cases would be needed to
isolate the effect of the initiative instruction.

[The recorded outputs and grades](evidence/prompt-improve-context/results.json)
include exact skill digests, the context-only comparison text, per-case tool
counts, and downstream outcomes. Early development trials caught an unnecessary
attachment lookup and unapproved branch selection. Two harness corrections
excluded a cart trial that directed the executor to edit and Git trials with
a local-path remote. The reported runs use the corrected fixtures and neutral
downstream framing throughout.

## Same-chat execution handoff

Verify these turn sequences in fresh Codex and Claude Code sessions using
disposable files. Check the actual files after each turn.

| Sequence | Expected behavior |
| --- | --- |
| Improve a prompt that asks to write the word `run` to `first.txt`. Request a revision changing the destination to `second.txt`. Reply `run`. | Each completed prompt has a separate run invitation. Both files stay untouched through the revision. Only the last prompt's destination receives the requested content after the user's reply. |
| Improve a prompt that refers to one of two possible destination files. Answer the scope question, then reply `run`. | The clarification contains only the question. The user's choice produces the finished prompt and invitation. Execution happens on the later `run` turn. |
| Ask for prompt text only and supply a complete draft. | Return the draft verbatim. Omit the invitation and leave the files untouched. |
| After an offer, revise the destination and ask for prompt text only. Reply `run` to the revision. | The revision has no invitation. Only the new destination changes on `run`. |
