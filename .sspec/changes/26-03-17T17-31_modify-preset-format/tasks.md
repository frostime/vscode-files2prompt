---
change: "modify-preset-format"
updated: "2026-03-17T18:05"
---

# Tasks

## Legend
`[ ]` Todo | `[x]` Done

## Tasks

### Phase 1: Preset Schema and Formatter Behavior ✅
- [x] Modify `package.json` — remove `plain` / `github` from `assembleCodeToPrompt.format.preset` and update enum descriptions
- [x] Modify `src/services/FormatterService.ts` — normalize legacy preset values to `markdown` per spec.md B
- [x] Modify `src/services/FormatterService.ts` — merge Markdown/GitHub output into the new four-backtick Markdown template
**Verification**: `format.preset` only exposes `xml` / `markdown` / `custom`; legacy `plain` / `github` values still render through the merged Markdown template at runtime

### Phase 2: Settings Migration on Activation ✅
- [x] Create `src/services/FormatPresetMigrationService.ts` — detect explicit legacy preset values by scope and write back `markdown`
- [x] Modify `src/services/index.ts` — export the migration service for consistent service-layer access
- [x] Modify `src/extension.ts` — run preset migration before `CommandRegistry` creates `FormatterService`
**Verification**: legacy values stored in user/workspace/workspace-folder settings migrate to `markdown` without changing untouched scopes; activation still succeeds if migration throws

### Phase 3: Docs and Validation ✅
- [x] Modify `README.md` — update preset list, merged Markdown example, and migration note
- [x] Validate the change with repo checks and a focused manual migration scenario
**Verification**: documentation matches runtime behavior; lint/build/manual verification confirms merged Markdown output and automatic fallback behavior

### Feedback Tasks
- [x] Modify `package.json` and `src/services/FormatPresetMigrationService.ts` — align setting scope with actual migration/runtime behavior
- [x] Modify `src/services/PromptGenerator.ts` and docs/tests as needed — make Markdown output shape match the request template end-to-end

<!-- @RULE: Organize by phases. Each task <2h, independently testable.
Phase emoji: ⏳ pending | 🚧 in progress | ✅ done

### Phase 1: <name> ⏳
- [ ] Task description `path/file.py`
- [ ] Task description `path/file.py`
**Verification**: <how to verify this phase>

### Feedback Tasks
Use this section for review/feedback tasks that still belong to the current change.
If accepted feedback changes scope/design, update `spec.md` first, then add the execution work here.
If the work should become a new follow-up or replacement change, do not put it here unless the user has first approved that direction via `@align`.
-->

---

## Progress

**Overall**: 100%

| Phase | Progress | Status |
|-------|----------|--------|
| Phase 1 | 100% | ✅ |
| Phase 2 | 100% | ✅ |
| Phase 3 | 100% | ✅ |
| Feedback | 100% | ✅ |

**Recent**:
- 2026-03-17T18:05: Completed feedback fixes for setting scope alignment and end-to-end Markdown prompt shape
- 2026-03-17T17:58: Added 2 feedback tasks after subagent audit findings
- 2026-03-17T17:46: Completed `README.md` preset docs refresh and focused manual validation script
- 2026-03-17T17:36: Completed activation-time preset migration in `src/services/FormatPresetMigrationService.ts`, `src/services/index.ts`, and `src/extension.ts`
- 2026-03-17T17:36: Completed `src/services/FormatterService.ts` preset normalization and merged Markdown template
- 2026-03-17T17:36: Completed `package.json` preset schema cleanup
- 2026-03-17T17:36: Planned 3 phases covering preset schema, activation-time migration, and docs/validation
