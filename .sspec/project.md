# Project Context

**Name**: vscode-files-to-prompt (Assemble LLM Prompt)
**Description**: VS Code 扩展：将文件、代码片段、终端输出、目录树与 Git Diff 组装为可直接投喂 LLM 的 Prompt。
**Repo**: https://github.com/frostime/vscode-files2prompt

## Tech Stack
- TypeScript 5.x（严格模式）
- Node.js（VS Code Extension Host 环境）
- VS Code Extension API（TreeView、Commands、Configuration）
- ESLint 9 + @typescript-eslint
- `uuid`（PromptItem ID 生成）
- `vsce`（扩展打包）

## Key Paths
<!-- @RULE: Most important directories/files for quick navigation.
Keep ≤10 entries. Agent uses this to orient in the codebase. -->

| Path | Purpose |
|------|---------|
| `src/extension.ts` | 扩展激活入口，组装依赖并注册资源 |
| `src/commands/CommandRegistry.ts` | 所有命令注册与路由中枢 |
| `src/core/PromptItemStore.ts` | PromptItem 内存存储与事件分发 |
| `src/providers/` | 各类内容采集器（文件/片段/终端/目录树/Git Diff/用户指令） |
| `src/services/PromptGenerator.ts` | Prompt 拼装流程与内容排序 |
| `src/services/FormatterService.ts` | 代码内容格式化预设与自定义脚本执行 |
| `src/services/IgnoreService.ts` | 文件夹递归时忽略规则解析 |
| `src/ui/PromptTreeDataProvider.ts` | Prompt 集合 TreeView 与拖拽排序 |
| `src/types/index.ts` | 领域类型定义（PromptItem 联合类型等） |
| `package.json` | 扩展 manifest、命令/视图贡献点、配置项与脚本 |

## Conventions
<!-- @RULE: Coding rules that apply across ALL work in this project.
One-liners only. If a convention needs multi-paragraph explanation → write a spec-doc.
Examples: "snake_case for Python, camelCase for JS", "All API routes: /api/v1/*",
"Never commit .env files", "Prefer composition over inheritance" -->

- 语言与模块：使用 TypeScript + ES Module，保持 strict 类型约束。
- 架构分层：`commands` 负责路由，`providers/services/core/ui` 各司其职，避免跨层耦合。
- 扩展命令命名：统一前缀 `assemble-code-to-prompt.`。
- 内容类型扩展：新增类型优先实现 `IContentProvider`，避免在现有命令中硬编码分支。
- 状态变更通知：`PromptItemStore` 是唯一状态源，通过事件驱动 UI 刷新。
- 配置读取：统一从 `assembleCodeToPrompt.*` 命名空间读取并支持 reload。
- 风格基线：遵循 ESLint 规则（`semi`、`curly`、`eqeqeq`、命名约定）。

## Notes
<!-- @RULE: Project-level memory. Append-only log of learnings, gotchas, preferences.
Agent appends here during @handover when a discovery is project-wide (not change-specific).
Format each entry as: `- YYYY-MM-DD: <learning>`
Prune entries that become outdated or graduate to Conventions/spec-docs. -->

- 2026-02-14: 初始化 SSPEC，优先沉淀“扩展架构规范 + Manifest 契约规范”两份 spec-doc，作为后续改动的默认上下文入口。
