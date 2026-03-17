# Handover: modify-preset-format

**Updated**: 2026-03-17T18:05

---

## Background
<!-- Write once on first session. What this change does and why (1-3 sentences).
Update only if scope fundamentally changes. Details belong in spec.md. -->

本次变更要把公开的 prompt format preset 收敛为 `xml` / `markdown` / `custom` 三项，并把原 `github` 风格并入新的默认 `markdown` 模板。升级过程中还需要自动迁移旧的 `plain` / `github` 设置，避免用户升级后留下失效配置。

## Git Baseline (Immutable)
<!-- Captured during `sspec change new` before any change files are written.
This section records the change starting point in git and must not be edited or refreshed later. -->

- Captured: before change file creation
- Repository: `H:/SrcCode/开源项目/vscode-files-to-prompt`
- Branch: `main`
- HEAD: `fb986614da8e5d286842d25ac0f052978d9955fd`
- Worktree: `dirty`
- Status Snapshot: raw `git status --short --branch` output

```text
## main...origin/main [ahead 1]
M  .sspec/.gitignore
A  .sspec/requests/26-03-17T17-22_modify-preset-format.md
A  .sspec/skills/.gitignore
```

## Working Memory (Stable)
<!-- Curated, long-lived context. Survives context compression and session boundaries.
If something becomes obsolete, mark it as obsolete with a timestamp instead of deleting silently. -->

### Key Files
<!-- Files critical to understanding/continuing this change.
- `path/file` - what it contains, why it matters -->

- `package.json` - 扩展设置 schema；`format.preset` 的枚举、默认值与说明都在这里定义。
- `src/services/FormatterService.ts` - 当前 preset 类型、格式化分支与可见 preset 列表的实现中心。
- `src/extension.ts` - 扩展激活入口；适合在创建 `CommandRegistry` 前执行设置迁移。
- `.sspec/spec-docs/manifest-contract.md` - 明确要求配置键删除/重命名前必须提供向后兼容迁移方案。
- `.sspec/changes/26-03-17T17-31_modify-preset-format/spec.md` - 当前设计文档，已定义 preset 收敛、Markdown 模板合并与配置迁移方案。

### Durable Memory (Typed, Timestamped)
<!-- Promote only facts still useful after the current batch ends.
Single/sub change preferred types: Alignment, Decision, VitalFinding, Constraint, Risk, VerificationShortcut.
Use a custom type only when none fit well; keep it short and clear.
- [2026-03-06T20:39] [Decision] Redis over Memcached because per-key TTL + persistence matter.
- [2026-03-06T20:39] [Constraint] Session Log stays append-only; real next action lives there.
Project-wide items -> ALSO append to project.md Notes. -->

- [2026-03-17T17:36] [Decision] 本次按 single change 处理；预计改动集中在 manifest、FormatterService、激活期迁移与文档，不需要拆分子 change。
- [2026-03-17T17:36] [VitalFinding] 当前仓库没有现成的设置迁移机制；`FormatterService` 只直接读取 `assembleCodeToPrompt.format.preset`，因此需新增激活期迁移入口并保留运行时 alias 兜底。
- [2026-03-17T17:36] [Constraint] `.sspec/spec-docs/manifest-contract.md` 要求删除或重命名已有配置键前先提供向后兼容迁移方案，本次不能只修改 `package.json` 枚举而不处理旧值。
- [2026-03-17T17:46] [VerificationShortcut] 关键验证命令：`npm run compile`、`npm run lint`、`node -e "...manual-validation..."`；其中 lint 只有仓库既有 warning，没有新增 error。
- [2026-03-17T17:58] [Risk] Subagent audit指出两点待确认：其一，`package.json` 未声明 resource scope，但迁移逻辑尝试处理 `workspaceFolder` 作用域；其二，`PromptGenerator` 仍会在格式化块前追加 `文件:` / `代码片段:` 前缀，最终输出未完全贴合 request 里的模板示例。
- [2026-03-17T18:05] [Decision] 接受 audit 反馈并在当前 change 内修复：将 `format.preset` 明确声明为 window scope，只迁移 global/workspace；同时让 `PromptGenerator` 在 markdown preset 下直接输出格式化块。

## Session Log (Append-Only)
<!-- Newest entry first. Each entry is an atomic batch (one cohesive work record).

Header format:
### 2026-03-06T20:39 [work-log] <short title>

Tags are freeform but must be readable. Examples: work-log, user-feedback, argue, risk.
Any user interaction (feedback, @align, @argue) MUST start a new log entry. -->

### 2026-03-17T18:05 [work-log] Audit feedback fixes applied

**Accomplished**
- 在 `package.json` 明确把 `assembleCodeToPrompt.format.preset` 声明为 `window` scope，并同步精简 `FormatPresetMigrationService` 为 global/workspace 两级迁移。
- 修改 `src/services/PromptGenerator.ts`，让 markdown preset 下的最终内容直接输出格式化块，不再额外加 `文件:` / `代码片段:` 前缀。
- 重新执行 `npm run compile`、`npm run lint` 与 focused manual validation，结果与修复后的行为一致。

**Next**
- 再次进入 review，等待用户确认或继续给反馈。

### 2026-03-17T17:58 [work-log] Subagent audit completed

**Accomplished**
- 按 `@subagent-audits` 运行了 3 个独立 review subagents，分别检查迁移正确性、formatter 行为和 manifest/docs 一致性。
- 审核共收敛出 2 个主要问题：workspaceFolder 迁移与设置 scope 可能不一致；`PromptGenerator` 仍在格式化块前保留中文前缀，导致最终模板与 request 示例不完全一致。
- 第 3 个 subagent 未发现新的 public surface 遗漏，但同样提示缺少自动化覆盖。

**Next**
- 向用户汇报审核结果，确认是否按 findings 继续修改当前 change。

### 2026-03-17T17:46 [work-log] Implementation complete and ready for review

**Accomplished**
- 更新 `package.json` 与 `README.md`，把公开 preset 收敛为 `xml` / `markdown` / `custom`。
- 修改 `src/services/FormatterService.ts`，把 legacy `plain` / `github` 统一规范化为 `markdown`，并输出带 filepath 注释的四反引号 Markdown 模板。
- 新增 `src/services/FormatPresetMigrationService.ts` 并在 `src/extension.ts` 激活阶段执行迁移，覆盖 user/workspace/workspaceFolder 三个作用域。
- 完成验证：`npm run compile` 通过；`npm run lint` 仅报告仓库既有 warning；手写 mock `vscode` 的 Node 脚本验证了 legacy 设置迁移与新 Markdown 输出。

**Next**
- 进入 review，等待用户确认实现结果或提出反馈。

**Notes**
- 若用户要求补 automated tests，可基于当前手写验证脚本沉淀为正式测试。

### 2026-03-17T17:36 [user-feedback] Design confirmed

**Accomplished**
- 用户确认按当前 spec 继续进入 plan 和 implementation。

**Next**
- 按 tasks.md 执行 preset schema 收敛、设置迁移与文档更新。

### 2026-03-17T17:36 [work-log] Research and draft design

**Accomplished**
- 读取 request、`project.md`、相关 spec-doc 与核心实现文件，确认本次属于 single change。
- 创建 change `.sspec/changes/26-03-17T17-31_modify-preset-format/` 并完成 `spec.md` 初稿。
- 识别出兼容性关键点：manifest 要移除旧 preset 枚举，但运行时仍需暂时接受 `plain` / `github`，并在激活阶段自动迁移设置。

**Next**
- 向用户做 design gate，对齐 `spec.md` 中的 preset 收敛、Markdown 模板和设置迁移方案。
- 用户确认后进入 plan / implement，补齐任务分解并开始改代码。

**Notes**
- 当前仓库没有自动化测试文件；实现阶段需要决定补充最小测试还是以手工验证为主。

### <ISO timestamp> [tag] <short title>

**Accomplished**
- ...

**Next**
- ...

**Notes** (optional)
- ...
