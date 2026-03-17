---
name: modify-preset-format
status: REVIEW
type: ''
change-type: single
created: 2026-03-17 17:31:06
reference:
- source: .sspec/requests/26-03-17T17-22_modify-preset-format.md
  type: request
  note: Linked from request
---
<!-- @RULE: Frontmatter
status: PLANNING | DOING | REVIEW | DONE | BLOCKED
change-type: single | sub
reference?: Array<{source, type: 'request'|'root-change'|'sub-change'|'prev-change' |'doc', note?}>

Sub-change MUST link root:
reference:
  - source: ".sspec/changes/<root-change-dir>"
    type: "root-change"
    note: "Phase <n>: <phase-name>"

Single-change common reference:
reference:
  - source: ".sspec/requests/<request-file>.md"
    type: "request"
  - source: ".sspec/changes/<change-dir>"
    type: "prev-change"
    note: "This change is a follow-up to <change-name> which introduced <feature/bug>. This change addresses <issue> with that feature/bug."
-->

# modify-preset-format

## A. Problem Statement
当前设置面板暴露 `xml` / `markdown` / `plain` / `github` / `custom` 5 个预设，但其中 `plain` 与 `github` 与 `markdown` 高度重叠，导致 3 个 Markdown 近似选项同时存在，增加用户决策成本并放大文档与维护负担。

当前 `markdown` 预设输出为三反引号代码块且没有文件头注释，遇到嵌套 ````` 内容时容易破坏最终 Prompt，可读性也弱于已有 `github` 风格；如果直接从 manifest 删除 `plain` / `github` 枚举而不迁移旧设置，升级后已有用户会留下失效配置，造成行为不透明。

<!-- @RULE: Quantify impact. Format: "[metric] causing [impact]".
Simple: single paragraph. Complex: split "Current Situation" + "User Requirement". -->

## B. Proposed Solution

<!-- @RULE: Accepted review-stage changes belong here as formal design.
If user feedback changes the current change's scope/design and the work still belongs to this change,
update A/B directly instead of leaving the accepted change only in handover.md.
If review history matters, add `### Review Amendments` under B as part of the design. -->

### Approach
将公开的格式预设收敛为 `xml`、`markdown`、`custom` 三项，其中新的 `markdown` 作为默认 Markdown 风格，直接吸收原 `github` 的路径注释能力，并统一改为四反引号围栏。这样用户只面对一个 Markdown 方案，而不是在“纯 Markdown / GitHub 风格 / 纯文本”之间做细碎选择。

兼容性采用“双层兜底”：一层在激活阶段执行设置迁移，把已持久化的 `plain` / `github` 自动改写为 `markdown`；另一层在 `FormatterService` 读取配置时继续接受旧值并规范化为 `markdown`，确保迁移尚未完成、用户手工残留旧值或工作区配置延迟刷新的情况下，生成结果仍然稳定。相比直接删除旧枚举并仅靠发布说明提示用户手动修改，这种方案对升级用户更平滑，也符合 manifest 兼容性约束。

### Key Design
### Interface Design

**Feat A: Preset schema收敛** — manifest 与运行时对外统一为 3 个有效预设，但运行时继续识别旧值别名。

```ts
type ActiveFormatPreset = 'xml' | 'markdown' | 'custom';
type LegacyFormatPreset = 'plain' | 'github';
type StoredFormatPreset = ActiveFormatPreset | LegacyFormatPreset;

interface FormatterConfig {
  preset: ActiveFormatPreset;
  customScript?: string;
}

function normalizeFormatPreset(
  preset: StoredFormatPreset | undefined
): ActiveFormatPreset;
```

**Feat B: Markdown 预设合并** — `formatMarkdown()` 成为唯一的 Markdown 输出模板，覆盖原 `markdown` 与 `github` 的能力，同时 `PromptGenerator` 在 Markdown preset 下不再额外包一层中文前缀。

```ts
function formatMarkdown(ctx: FormatContext): string;

// Output template
// <!-- filepath: {PATH_OR_SNIPPET_RANGE} -->
// ````{LANG}
// {CONTENT}
// ````
```

`{PATH_OR_SNIPPET_RANGE}` 对文件保持 `relative/path.ts`，对代码片段保持 `relative/path.ts#L10-L24`，沿用现有 `github` 预设的定位方式；`{LANG}` 为空时回退为 `text`。

**Feat C: 设置迁移** — 新增一个专门的迁移入口，在扩展激活时把窗口级设置中的旧值自动写回 `markdown`。

```ts
async function migrateLegacyFormatPreset(): Promise<void>;

type MigrationTarget = 'global' | 'workspace';
```

### Data Flow

```text
VS Code activate()
  │
  ├── migrateLegacyFormatPreset()
  │     ├── inspect user/workspace `format.preset`
  │     ├── map `plain` -> `markdown`
  │     ├── map `github` -> `markdown`
  │     └── persist updated values back to the same scope
  │
  ├── new CommandRegistry(store)
  │     └── new FormatterService()
  │            └── loadConfig() -> normalizeFormatPreset()
  │
  └── PromptGenerator.formatCodeItem()
        └── formatterService.format() -> formatMarkdown()/formatXml()/formatCustom()
```

说明：迁移负责“清理持久化设置”，规范化负责“保证运行时安全兜底”。两者同时存在，可以避免升级瞬间因为旧值残留而落回 XML 或出现未知 preset 分支。

### Key Logic

**Feat A: Preset schema收敛**
- `package.json` 的 `assembleCodeToPrompt.format.preset` 枚举删去 `plain` 与 `github`，默认值仍保持 `xml`。
- README 与设置描述同步改成 3 个预设，明确说明升级时旧值会自动迁移到 `markdown`。
- `FormatterService.getAvailablePresets()` 只返回 3 个可见选项，避免 UI 或未来命令面板再次暴露旧值。

**Feat B: Markdown 预设合并**
- 删除独立的 `formatPlain()` / `formatGitHub()` 分支，旧值全部通过 `normalizeFormatPreset()` 折叠到 `markdown`。
- 新 `formatMarkdown()` 始终输出文件头注释与四反引号围栏，以解决代码片段中包含三反引号时的嵌套冲突。
- `PromptGenerator` 在 `markdown` preset 下直接输出格式化后的块，不再额外追加 `文件:` / `代码片段:` 前缀；其余章节（终端输出、目录树、Git Diff）保持现状。

**Feat C: 设置迁移**
- `package.json` 明确把该设置声明为 window scope，使公开 schema 与运行时读取方式保持一致。
- 激活阶段检查 `assembleCodeToPrompt.format.preset` 在用户级与工作区级的显式值，只迁移确实存储为 `plain` 或 `github` 的项。
- 迁移写回原作用域，避免把工作区配置错误提升到用户级，也避免覆盖未设置该项的作用域。
- 若迁移失败，仅记录日志并依赖运行时规范化兜底，不阻止扩展继续激活。

### Scope Summary
| File | Change |
|------|--------|
| `package.json` | 收敛 `format.preset` 枚举与描述，去掉 `plain` / `github`，补充升级兼容说明 |
| `src/services/FormatterService.ts` | 增加 legacy preset 规范化逻辑，合并 Markdown/GitHub 模板并移除可见旧选项 |
| `src/services/PromptGenerator.ts` | 在 markdown preset 下移除额外的中文路径前缀，保证输出模板与 request 示例一致 |
| `src/extension.ts` | 在依赖装配前触发格式预设迁移，确保首次加载即读取到新值 |
| `src/services/FormatPresetMigrationService.ts` | 新增设置迁移实现，负责按配置作用域检测并回写旧 preset |
| `README.md` | 更新用户文档中的预设列表与 Markdown 输出示例 |
