---
name: side-select-subset
status: REVIEW
change-type: single
created: 2026-05-27 22:52:50
reference:
- source: .sspec/requests/26-05-27T17-41_side-select-subset.md
  type: request
  note: Linked from request
---

# side-select-subset

## Problem Statement

侧边栏的"生成 Prompt"按钮会把 store 里**所有** item 一股脑拼进 prompt，用户无法选择只使用其中一部分。当 item 数量较多、只想先用其中几个时，被迫生成全部内容，增加了手动删除的负担。

GitHub issue: https://github.com/frostime/vscode-files2prompt/issues/1

## Proposed Solution

### Approach

给每个 `PromptItem` 增加 `selected: boolean` 字段，利用 VS Code 原生 `TreeItem.checkboxState` 在侧边栏渲染 checkbox UI。生成 prompt 时只传 `selected === true` 的 item。全选/取消全选通过两个标题栏按钮实现。

选中状态**不持久化**，每次打开 VS Code 默认全选。新增 item 默认选中。

相比自定义 WebView checkbox 方案，使用 VS Code 原生 checkbox 零额外 UI 代码、主题一致、无障碍支持完整。

### Key Change

**Feat A: 数据层 — PromptItem 增加 selected 字段**
- `PromptItemBase` 增加 `selected: boolean`
- `PromptItemStore.add()` 新增 item 时默认 `selected: true`（`??=` 运行时防御）
- `PromptItemStore` 新增 `setSelected(id, value)` 和 `selectAll(value)` 方法
- **所有 Provider 创建对象时显式补 `selected: true`**（FileProvider / SnippetProvider / TerminalProvider / FolderTreeProvider / GitDiffProvider / UserInstructionProvider）

**Feat B: UI 层 — TreeView 原生 checkbox**
- `PromptTreeDataProvider.getTreeItem()` 根据 `item.selected` 设置 `checkboxState`
- TreeView 注册 `onDidChangeCheckboxState` 事件，用户点击 checkbox 时更新 store

**Feat C: 命令层 — 全选/取消全选 + 生成/导出过滤**
- 新增 `selectAllItems` / `deselectAllItems` 命令，注册到 TreeView 标题栏
- `generatePrompt` / `exportToZip` 过滤 `selected === true` 的 item，空集时弹 warning

### Acceptance Criteria

- [ ] 点击 checkbox 切换单个 item 选中状态
- [ ] 全选/取消全选按钮批量切换所有 item
- [ ] 生成 Prompt / 导出 ZIP 只包含选中项
- [ ] 空选集时弹 warning，不生成/导出
- [ ] 拖拽/上移/下移不改变选中状态
- [ ] 清空后再添加项默认选中
- [ ] 新增 item（任何来源）默认选中

### Scope Summary

| File | Change |
|------|--------|
| `src/types/index.ts` | `PromptItemBase` 增加 `selected: boolean` |
| `src/core/PromptItemStore.ts` | `add()` 增加 `selected` 默认值防御；新增 `setSelected()` / `selectAll()` 方法 |
| `src/providers/*.ts` | 所有 Provider（File/Snippet/Terminal/FolderTree/GitDiff/UserInstruction）创建对象时补 `selected: true` |
| `src/ui/PromptTreeDataProvider.ts` | `getTreeItem()` 设置 `checkboxState` |
| `src/commands/CommandRegistry.ts` | 新增 selectAll/deselectAll 命令；`generatePrompt` / `exportToZip` 增加过滤 |
| `src/extension.ts` | TreeView 创建后注册 `onDidChangeCheckboxState` 事件监听，disposable 加入 subscriptions |
| `package.json` | 注册 selectAll/deselectAll 命令，view/title 菜单新增按钮 |

### Design Reference

→ See [design.md](./design.md)
