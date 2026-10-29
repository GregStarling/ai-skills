# Discovering what complete means

Contents: [Perspectives](#perspectives) · [Pass A: explicit](#pass-a-explicit-requirements) ·
[Pass B: implied](#pass-b-necessary-implied-requirements) ·
[Pass C: systematic](#pass-c-systematic-completeness-review) ·
[Pass D: pre-mortem](#pass-d-pre-mortem) · [Keep challenging](#keep-challenging) ·
[Writing good items](#writing-good-items)

Use this before substantial implementation, and again whenever the work reveals
something the checklist missed. Inspect the actual system first: requirements
derived without the real implementation describe generic risks, not this
project's needs.

## Perspectives

Look at the objective as each of these roles:

| Role | Question |
| --- | --- |
| CTO | What must be delivered for the project to succeed? |
| Architect | What dependencies, interfaces and constraints matter? |
| Product owner | What functionality does the user reasonably expect? |
| QA engineer | Where could the implementation fail? |
| End user | Can someone actually accomplish the intended task? |
| Operator | How will failures be detected, diagnosed and recovered from? |

## Pass A: explicit requirements

Capture every stated requirement, constraint, acceptance criterion and non-goal,
and keep each one traceable to the request. A constraint such as "preserve the
existing API" is a verifiable requirement, not background commentary. Include
corrections the user made later and requirements stated only in conversation.
Nothing explicitly required may disappear from the checklist.

## Pass B: necessary implied requirements

Identify what the requested result needs in order to work correctly, even when
the user did not mention it. For example, a data-entry form usually implies
validation, meaningful feedback, persistence and recovery from failed
submissions. Do not implement every conceivable supporting feature.

Apply the **Scope Gate** to each candidate:

> If this were missing, would the requester or a competent reviewer reasonably
> consider the requested work incomplete, defective, or unusable?

- **Yes:** add it as a required item.
- **No:** leave it out of required work. Record it under Exclusions as optional
  or beyond scope if that is useful.

Thoroughness is not feature accumulation.

## Pass C: systematic completeness review

Evaluate each relevant dimension against the actual system:

- **Requirements:** requested features, constraints, acceptance criteria and compatibility promises.
- **People and permissions:** user roles, authorization boundaries, anonymous access, administrative behavior and prohibited access.
- **States and workflows:**
  - first run, empty, loading, partial, success, error, stale and recovery states;
  - primary and secondary journeys;
  - zero, one, many and maximum-value conditions.
- **Inputs:**
  - missing, malformed, duplicate, oversized, hostile and unexpected inputs;
  - concurrent actions, repeated submissions, time zones and locale behavior where relevant.
- **Data:** creation, retrieval, updates, deletion, persistence, defaults, migrations, retention and backward compatibility.
- **Integrations:** callers and callees, APIs, background jobs, queues, webhooks, caches, flags, configuration and environment-specific behavior.
- **Failures:** timeouts, unavailable dependencies, retries, partial failures, idempotency, useful error feedback and protection against silent data loss.
- **Security and privacy:** authentication, authorization, validation, secrets, sensitive information and data integrity.
- **User experience:** usability, navigation, consistency, accessibility, responsive behavior, feedback and recovery.
- **Performance:** realistic data volumes, workloads, responsiveness and resource usage.
- **Operations:** configuration, logging, diagnostics, monitoring, alerts and supportability where appropriate.
- **Testing:** unit, integration, end-to-end, regression and necessary manual verification.
- **Documentation:** required usage instructions, and existing project documentation that must stay accurate.
- **Release:** deployment dependencies, migration order, compatibility, rollback requirements and verification of the published result when release is authorized.
- **Implementation residue:** unfinished TODOs, placeholders, fake or disconnected controls, production stubs, hardcoded development values, debug artifacts and unused remnants.

For non-software work such as research, analysis or documents, adapt the
dimensions to correctness, completeness, source accuracy, analytical rigor,
usability and delivery requirements.

Evaluate every relevant dimension, but do not generate items for all of them
mechanically. Record meaningful exclusions and their reasons. Do not create
unnecessary work to make the checklist look thorough.

## Pass D: pre-mortem

Assume the work was delivered and failed within its first week. Ask:

- What would the first user complain about?
- Which workflow would fail outside the happy path?
- Which assumption might turn out to be wrong?
- What could cause incorrect, missing or corrupted data?
- Which integration might fail unexpectedly?
- What would a skeptical reviewer notice immediately?

For substantial tasks, identify at least three credible failure scenarios and
record them under Pre-Mortem. Each material scenario must either become an item
or be mapped to an existing item or a demonstrated protection. Do not turn
speculative or irrelevant possibilities into mandatory work.

## Keep challenging

The first checklist is a hypothesis. Throughout the work, ask:

- What did the user reasonably expect that is not implemented yet?
- What would prevent a real user from completing the intended workflow?
- Which paths have never been exercised?
- What happens when inputs are invalid or data is missing?
- What happens when dependencies are unavailable?
- Could the changes break existing functionality?
- Are any controls, features or integrations visible but disconnected?
- Do the tests validate meaningful behavior, or do they only produce passing results?
- Is any completed item supported only by an assumption?
- Would a competent reviewer find something obviously unfinished?

When a material gap passes the Scope Gate, add it immediately, then verify it
and log it. Do not expand the checklist indefinitely with unrelated
enhancements. The checklist must evolve to match reality, not be protected
from it.

## Writing good items

Prefer small, independently verifiable outcomes:

| Weak | Strong |
| --- | --- |
| Implement the backend. | Submitting a valid record persists it and makes it retrievable after reload. |
| Handle errors. | A failed external API call leaves the transaction in a recoverable state. |
| Test the feature. | An unauthorized user cannot retrieve another user's records. |
| Make everything production-ready. | (Split it into the specific outcomes that "ready" requires here.) |

Each verification method must be able to fail. Reading code establishes static
facts, but does not by itself prove runtime behavior. Scale detail to the real
complexity: a small change gets a small, rigorous checklist, and a substantial
project may need dozens of items. Aim for complete coverage without unnecessary
work, not for the fewest items.
