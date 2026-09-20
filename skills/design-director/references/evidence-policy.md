# Evidence policy

## Classes and strength

Classify sources as `product_direction`, `repository_artifact`, `research`,
`outcome`, `analytics_support`, `live_observation`, `design_review`, or
`heuristic`. Assign `primary`, `supporting`, or `hypothesis` strength.

Strong evidence is current, attributable, clause-specific primary evidence that
survives a challenge against competing evidence and plausible alternative
explanations. It does not need repetition. A heuristic or design review is not
strong on its own even if labeled primary.

Design principles are `SHOULD` defaults classified as heuristic guidance, not
product evidence. Use them to frame decisions, identify review questions, and
suggest experiments. A principle or principle violation cannot establish,
replace, or retire a constitution clause and cannot prove constitutional
failure without clause-specific product evidence.

## Authority order

Prefer, in context:

1. explicit product direction or required external authority;
2. verified product facts and protected behavior;
3. observed outcomes and research tied to the relevant users/surfaces;
4. coherent incumbent patterns supported by repository evidence;
5. design principles, design reviews, and other heuristics as prompts for
   investigation.

Conflicts are resolved by relevance, recency, attribution, specificity, and
adversarial survivability—not by source count.

## Prohibited promotions

Do not establish or amend a clause from a category/style lookup, trend,
popularity, design principle, unsupported critic preference, clean lint/test
result, or the current output citing itself. These may suggest questions or
provisional experiments only.

For an amendment, cite evidence in both the affected clause and change set.
Each replace or retire operation must have strong evidence whose `clause_ids`
explicitly includes that operation's clause; unrelated primary evidence is not
authority. The resolution-level evidence must carry the same link.
State the expected consequence, verification method, affected surfaces, and
rollback revision. The rollback revision must be the pinned expected base.
Preserve genuine unknowns rather than laundering them into confidence.
