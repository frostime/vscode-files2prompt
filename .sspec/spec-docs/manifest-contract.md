---
name: Manifest Contract
description: package.json 中 VS Code 贡献点与配置键的稳定契约
updated: 2026-02-14
scope:
  - /package.json
  - /src/commands/**
  - /src/ui/**
  - /src/services/**
deprecated: false
replacement: ""
---

# Manifest Contract

## Overview

`package.json` 是扩展对 VS Code 平台的契约边界。命令 ID、视图 ID、配置键一旦发布，应保持兼容；如需破坏性变更，必须走显式迁移。

## Command Namespace

- 命令前缀固定：`assemble-code-to-prompt.`
- 由 `src/commands/CommandRegistry.ts` 统一注册。
- 新命令必须同时更新：
  - `package.json` `contributes.commands`
  - `CommandRegistry.register()`
  - 如涉及菜单入口，更新 `contributes.menus`

当前核心命令分组：
- 添加类：`addFileToPrompt`、`addOpenedFilesToPrompt`、`addSelectionToPrompt`、`addTerminalOutputToPrompt`、`addFolderTreeToPrompt`、`addGitDiffCachedToPrompt`、`addGitDiffFileToPrompt`、`addUserInstructionToPrompt`
- 管理类：`editStaticPromptItem`、`removeItemFromPrompt`、`moveItemUp`、`moveItemDown`、`clearPromptItems`
- 输出类：`generatePrompt`、`exportToZip`
- 维护类：`reloadConfig`

## View & Container IDs

以下 ID 视为稳定契约：
- Activity Bar Container: `prompt-explorer`
- Tree View: `promptItemsView`

修改这些 ID 会导致用户已有布局、快捷入口和 when 条件失效。

## Configuration Keys

配置命名空间固定：`assembleCodeToPrompt.*`

稳定键：
- `assembleCodeToPrompt.ignore.directories`
- `assembleCodeToPrompt.ignore.files`
- `assembleCodeToPrompt.ignore.extensions`
- `assembleCodeToPrompt.ignore.patterns`
- `assembleCodeToPrompt.format.preset`
- `assembleCodeToPrompt.format.customScript`

约束：
- 读取入口统一在服务层（`IgnoreService`、`FormatterService`）。
- 配置变更通过 `reloadConfig`/`onDidChangeConfiguration` 生效。
- 删除或重命名已有配置键前，先提供向后兼容迁移方案。

## Menu Contract

`addToPromptSubmenu` 用于聚合“添加内容”动作，分组采用有序前缀（如 `1_content@1`、`2_structure@1`）。

规则：
- 新增菜单项时保持分组语义稳定。
- 避免跨组重排造成用户肌肉记忆破坏。

## Compatibility Rules

- 保持 `engines.vscode` 与使用到的 API 能力一致。
- 破坏性变更至少满足以下之一：
  - 提供旧 ID 到新 ID 的兼容映射；
  - 在发布说明中明确迁移步骤并给出替代命令。

## Change Checklist

涉及 `package.json` 贡献点改动时，必须同步检查：
- 命令是否在代码中真实注册。
- 视图 ID 与代码创建 ID 是否一致。
- `README.md` 命令说明是否仍准确。
- 相关 spec-doc 的 `updated` 字段是否更新。
