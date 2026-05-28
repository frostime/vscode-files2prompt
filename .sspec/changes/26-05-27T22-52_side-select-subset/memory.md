# Memory: side-select-subset

**Updated**: <!-- ISO timestamp, minute precision -->

## Git Baseline (Immutable)
<!-- Captured during `sspec change new` before any change files are written.
This section records the change starting point in git and MUST NOT be edited or refreshed later. -->

- Captured: before change file creation
- Repository: `H:/SrcCode/开源项目/vscode-files-to-prompt`
- Branch: `feat/use-subset`
- HEAD: `2f7c8aa8d655be7e811479b45f305159e03414ed`
- Worktree: `clean`
- Status Snapshot: raw `git status --short --branch` output

```text
## feat/use-subset
```

## State
<!-- Where we are and what's next — one to three lines.
This is the resume entry point; the first section an agent reads on cold start. -->

Phase: **Implement** (完成)
Next: **Review** — 用户确认后进入 sspec-review 阶段。

## Key Files
<!-- Files critical to understanding/continuing this change.
- `path/file` — what it contains, why it matters -->

- `.sspec/changes/26-05-27T22-52_side-select-subset/spec.md` — 需求规格，含 Acceptance Criteria
- `.sspec/changes/26-05-27T22-52_side-select-subset/design.md` — 技术设计，含数据模型/事件流/UI 规范
- `.sspec/changes/26-05-27T22-52_side-select-subset/tasks.md` — 三阶段执行计划
- `src/types/index.ts` — PromptItemBase 定义，需加 `selected: boolean`
- `src/core/PromptItemStore.ts` — 数据存储，需加 `setSelected()` / `selectAll()`
- `src/providers/*.ts` — 6 个 provider，创建对象时需补 `selected: true`
- `src/ui/PromptTreeDataProvider.ts` — TreeView 数据提供者，需设置 `checkboxState`
- `src/commands/CommandRegistry.ts` — 命令注册，需加 selectAll/deselectAll + 过滤逻辑
- `src/extension.ts` — 扩展入口，需注册 `onDidChangeCheckboxState` 事件

## Knowledge
<!-- MUST apply write-gate: "If this item were lost, would the next agent make a wrong decision?"
Yes → write it. No → skip.

Target reader: a cold-starting agent that can only see spec + design + tasks + this Knowledge.
Exclude: anything already covered by spec/design/tasks (no restating).
Include: rejected approaches with reasons, implicit constraints, user preferences, API/env traps, insights that shaped design choices.

Format: - [timestamp] [Type] content
Types: Decision | Constraint | Gotcha | Rejected | Insight
  Decision  = directional choice made (with rationale)
  Constraint = hard limit imposed externally or by user
  Gotcha     = trap invisible without reading code/docs
  Rejected   = approach considered and discarded (with why — prevents successor from re-trying)
  Insight    = finding that shaped understanding but is not itself a decision

Project-level discoveries → ALSO append to project.md Notes.
Obsolete items → mark [obsolete: timestamp], never silently delete. -->

- [2026-05-27] [Gotcha] 所有 6 个 provider（File/Snippet/Terminal/FolderTree/GitDiff/UserInstruction）创建 PromptItem 对象时未含 `selected` 字段，加上 `PromptItemBase.selected: boolean` 必填后会编译失败。必须逐个补 `selected: true`。
- [2026-05-27] [Decision] `onDidChangeCheckboxState` 是 TreeView 事件，需在 extension.ts 注册并 push disposable 到 subscriptions，不应放在 PromptTreeDataProvider 中。
- [2026-05-27] [Decision] `selectAll()` 的 event payload 用 `[...this.items]` 副本，避免暴露内部数组引用。

## Milestones
<!-- MUST append one line per session. Pure facts; new entries appended at the end.
CLI treats the last valid bullet as the latest milestone.
- [ISO timestamp] one-sentence summary -->

- [2026-05-27T22:52] Change created，进入 Planning
- [2026-05-27T23:00] spec.md + design.md 完成，subagent 审查通过（有条件）
- [2026-05-27T23:15] Plan 完成，tasks.md 三阶段 19 个任务，准备进入 Implement
- [2026-05-27T23:30] Implement 完成，三阶段全部通过编译验证
