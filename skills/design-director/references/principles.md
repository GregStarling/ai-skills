# Design principles

These principles are strong, context-sensitive defaults. The floor is mandatory;
principles are rebuttable; the constitution holds evidence-backed product truth;
task context narrows the immediate assignment. When a principle conflicts with
trustworthy product evidence, follow the evidence within floor constraints and
record the decision. A principle or its violation cannot establish a constitution
clause or constitutional failure on its own.

Apply the principles selected by the active practice profiles in this canonical
order. `perception_evaluation` selects the complete set.

## 1. next_action_clarity

- **Directive:** Make the next meaningful action clear.
- **Applies to:** `strategy_ux`, `interaction_motion`, `content_ia`, `perception_evaluation`
- **Guardrail:** Do not erase legitimate alternatives or force a single path where intent differs.
- **Verification:** Can a person identify the next useful action without scanning competing choices?
- **Design-system implications:** Establish clear action hierarchy, restrained primary-action emphasis, and components that distinguish commands from alternatives without hiding valid paths.
- **Originating laws:** Hick's Law; Serial Position Effect.

## 2. progressive_complexity

- **Directive:** Reveal complexity at the pace of need.
- **Applies to:** `strategy_ux`, `content_ia`, `perception_evaluation`
- **Guardrail:** Do not hide information required for an informed or consequential decision.
- **Verification:** Is each layer of detail available before it becomes necessary, without arriving earlier?
- **Design-system implications:** Provide disclosure, staged forms, summaries, and advanced-control patterns with explicit states and accessible relationships.
- **Originating laws:** Hick's Law; Miller's Law; Tesler's Law.

## 3. memory_offloading

- **Directive:** Move memory into the interface.
- **Applies to:** `strategy_ux`, `interaction_motion`, `content_ia`, `perception_evaluation`
- **Guardrail:** Do not add persistent explanation when recognition, context, or a visible state is enough.
- **Verification:** Can the task be completed by recognizing visible options and state rather than recalling them?
- **Design-system implications:** Keep state, selections, constraints, recent context, and available actions visible through labels, summaries, previews, and persistent task cues.
- **Originating laws:** Miller's Law.

## 4. familiar_behavior

- **Directive:** Build on familiar behavior.
- **Applies to:** `strategy_ux`, `interaction_motion`, `content_ia`, `redesign_archaeology`, `perception_evaluation`
- **Guardrail:** Depart from convention when product evidence shows the familiar pattern is misleading or insufficient.
- **Verification:** Do controls and flows behave as their appearance, platform, and product history imply?
- **Design-system implications:** Prefer platform conventions and established product components; document intentional behavioral departures as variants rather than visually disguising them as familiar controls.
- **Originating laws:** Jakob's Law.

## 5. pattern_consistency

- **Directive:** Make patterns internally consistent.
- **Applies to:** `visual_direction`, `interaction_motion`, `content_ia`, `redesign_archaeology`, `perception_evaluation`
- **Guardrail:** Do not preserve a pattern whose meaning or behavior is wrong merely for visual uniformity.
- **Verification:** Do repeated meanings use the same component, language, placement, and behavior?
- **Design-system implications:** Bind repeated semantics to shared components, tokens, terminology, placement rules, and state behavior while allowing corrected patterns to replace misleading precedents.
- **Originating laws:** Law of Similarity; Jakob's Law.

## 6. semantic_relationships

- **Directive:** Use space and structure to express relationships.
- **Applies to:** `visual_direction`, `content_ia`, `redesign_archaeology`, `perception_evaluation`
- **Guardrail:** Do not rely on proximity, color, or visual connection as the only semantic signal.
- **Verification:** Does the visible grouping match the content and control relationships in every supported state?
- **Design-system implications:** Define spacing, grouping, divider, container, label, and connected-control patterns whose semantic markup preserves the same relationships.
- **Originating laws:** Law of Proximity; Uniform Connectedness; Law of Pragnanz.

## 7. faithful_simplicity

- **Directive:** Prefer the simplest faithful representation.
- **Applies to:** `visual_direction`, `content_ia`, `redesign_archaeology`, `perception_evaluation`
- **Guardrail:** Simplification must not remove necessary distinctions, consequences, or recovery paths.
- **Verification:** Can anything be removed without reducing truth, capability, comprehension, or trust?
- **Design-system implications:** Favor the least complex component and content structure that preserves domain distinctions, consequential detail, supported states, and recovery.
- **Originating laws:** Law of Pragnanz; Occam's Razor.

## 8. scarce_emphasis

- **Directive:** Treat emphasis as a limited resource.
- **Applies to:** `visual_direction`, `interaction_motion`, `content_ia`, `redesign_archaeology`, `perception_evaluation`
- **Guardrail:** Do not make secondary information invisible or use emphasis to coerce a consequential choice.
- **Verification:** Does the strongest emphasis identify the most important current distinction or action?
- **Design-system implications:** Budget accent color, contrast, scale, motion, and primary styling through a small hierarchy with explicit rules for simultaneous emphasis.
- **Originating laws:** Von Restorff Effect; Serial Position Effect.

## 9. local_targeting

- **Directive:** Make actions easy to acquire and locally relevant.
- **Applies to:** `interaction_motion`, `perception_evaluation`
- **Guardrail:** Do not enlarge or move a target in ways that create ambiguity, accidental activation, or layout instability.
- **Verification:** Are targets sufficiently large, separated, and near the information or object they affect?
- **Design-system implications:** Set minimum target sizes and spacing, place contextual actions near their objects, and keep target geometry stable across states and input modes.
- **Originating laws:** Fitts's Law; Minimize Target Distance.

## 10. responsive_feedback

- **Directive:** Respond immediately and represent time honestly.
- **Applies to:** `interaction_motion`, `perception_evaluation`
- **Guardrail:** Immediate acknowledgment must not falsely imply that delayed work has completed.
- **Verification:** Does every action receive perceptible acknowledgment within 400 ms and truthful ongoing status?
- **Design-system implications:** Standardize pressed, pending, optimistic, progress, success, and failure states so acknowledgment is immediate while completion remains truthful.
- **Originating laws:** Doherty Threshold.

## 11. error_prevention_recovery

- **Directive:** Prevent errors, then design excellent recovery.
- **Applies to:** `strategy_ux`, `interaction_motion`, `perception_evaluation`
- **Guardrail:** Do not block valid expert behavior merely to eliminate every possible mistake.
- **Verification:** Are likely errors prevented, explained in context, and recoverable without losing valid work?
- **Design-system implications:** Supply constraints, validation, confirmation, undo, retry, draft preservation, and contextual error patterns that retain valid input and support expert escape paths.
- **Originating laws:** Tesler's Law; Postel's Law.

## 12. legible_resumable_progress

- **Directive:** Make progress legible and resumable.
- **Applies to:** `strategy_ux`, `interaction_motion`, `content_ia`, `perception_evaluation`
- **Guardrail:** Do not use progress indicators that imply certainty or precision the system does not have.
- **Verification:** Can a person tell what is complete, what remains, and how to resume after interruption?
- **Design-system implications:** Define truthful step, checklist, status, save-state, and resume patterns that expose completion, remaining work, and interruption recovery.
- **Originating laws:** Zeigarnik Effect.

## 13. deliberate_beginnings_endings

- **Directive:** Design beginnings and endings deliberately.
- **Applies to:** `strategy_ux`, `visual_direction`, `content_ia`, `redesign_archaeology`, `perception_evaluation`
- **Guardrail:** A memorable ending must confirm the real outcome, not decorate or exaggerate it.
- **Verification:** Does the entry establish orientation and does completion confirm outcome, consequence, and next state?
- **Design-system implications:** Provide orientation, empty-state, onboarding, confirmation, receipt, and next-step patterns that make entry and completion semantically explicit.
- **Originating laws:** Serial Position Effect; Peak-End Rule.

## 14. total_user_effort

- **Directive:** Minimize total user effort, not merely visible steps.
- **Applies to:** `strategy_ux`, `interaction_motion`, `perception_evaluation`
- **Guardrail:** Do not trade fewer clicks for more uncertainty, waiting, correction, or irreversible risk.
- **Verification:** Is the full path efficient when decision effort, movement, waiting, correction, and recovery are counted?
- **Design-system implications:** Evaluate patterns across the complete journey, including decisions, input, navigation, latency, correction, and recovery instead of optimizing component-level click counts.
- **Originating laws:** Fitts's Law; Minimize Target Distance; Parkinson's Law.

## 15. reversible_defaults

- **Directive:** Use defaults to absorb routine complexity.
- **Applies to:** `strategy_ux`, `interaction_motion`, `perception_evaluation`
- **Guardrail:** Defaults must be visible, appropriate, and reversible, especially when consequences are material.
- **Verification:** Does the default serve the common valid case while remaining understandable and easy to change?
- **Design-system implications:** Specify visible defaults, suggested values, reset behavior, and consequence-aware confirmation; never encode consequential choices as hidden or irreversible presets.
- **Originating laws:** Tesler's Law; Pareto Principle.

## 16. bounded_input_tolerance

- **Directive:** Be flexible about form and strict about meaning.
- **Applies to:** `strategy_ux`, `interaction_motion`, `perception_evaluation`
- **Guardrail:** Tolerance must not silently reinterpret ambiguous, unsafe, or consequential input.
- **Verification:** Does the interface accept harmless variation while surfacing ambiguity before meaning changes?
- **Design-system implications:** Normalize harmless formatting differences and offer forgiving input components while requiring clarification before ambiguous or consequential interpretation.
- **Originating laws:** Postel's Law.

## 17. vital_paths_complete_edges

- **Directive:** Optimize common paths without abandoning the edges.
- **Applies to:** `strategy_ux`, `content_ia`, `redesign_archaeology`, `perception_evaluation`
- **Guardrail:** Frequency does not excuse inaccessible, unsafe, or unrecoverable uncommon states.
- **Verification:** Is the common path direct while valid edge cases remain complete, understandable, and recoverable?
- **Design-system implications:** Make frequent valid flows efficient, then require components to specify empty, loading, error, overflow, permission, accessibility, and uncommon valid states.
- **Originating laws:** Pareto Principle.

## 18. honest_completion_distance

- **Directive:** Make completion concrete, not artificially close.
- **Applies to:** `strategy_ux`, `interaction_motion`, `content_ia`, `perception_evaluation`
- **Guardrail:** Do not conceal required work or use false urgency, progress, or scarcity to accelerate completion.
- **Verification:** Does the interface show remaining work and commitment honestly while keeping the next milestone concrete?
- **Design-system implications:** Use milestone, estimate, commitment, and progress patterns that expose required work and uncertainty without manufactured urgency or false precision.
- **Originating laws:** Zeigarnik Effect; Parkinson's Law.

## 19. evidence_over_heuristics

- **Directive:** Let evidence outrank every principle.
- **Applies to:** `strategy_ux`, `visual_direction`, `interaction_motion`, `content_ia`, `redesign_archaeology`, `perception_evaluation`
- **Guardrail:** Evidence must be relevant, trustworthy, and interpreted within mandatory safety and accessibility constraints.
- **Verification:** Where evidence and a principle disagree, is the chosen design justified by stronger product evidence?
- **Design-system implications:** Record evidence, exceptions, and validation criteria alongside pattern decisions; allow evidence-backed variants without weakening mandatory floor requirements.
- **Originating laws:** All listed laws as bounded heuristics; Occam's Razor as a reminder not to add unsupported rules.
