/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 * @Author       : frostime
 * @Date         : 2025-04-18 15:05:28
 * @FilePath     : /src/extension.ts
 * @Description  : VS Code 扩展入口
 */
import * as vscode from 'vscode';
import { PromptItemStore } from './core/PromptItemStore';
import { PromptTreeDataProvider } from './ui/PromptTreeDataProvider';
import { StatusBarController } from './ui/StatusBarController';
import { CommandRegistry } from './commands/CommandRegistry';

/**
 * 扩展激活入口
 * 
 * 遵循依赖注入原则，在入口点组装所有依赖
 */
export function activate(context: vscode.ExtensionContext): void {
  // 核心数据存储（单例）
  const store = new PromptItemStore();

  // UI 组件
  const treeDataProvider = new PromptTreeDataProvider(store);
  const statusBarController = new StatusBarController(store);

  // 创建 TreeView
  const treeView = vscode.window.createTreeView('promptItemsView', {
    treeDataProvider,
    dragAndDropController: treeDataProvider,
    showCollapseAll: true
  });

  // 注册命令
  const commandRegistry = new CommandRegistry(store);
  commandRegistry.register(context);

  // 注册需要释放的资源
  context.subscriptions.push(
    treeView,
    statusBarController,
    { dispose: () => store.dispose() },
    { dispose: () => treeDataProvider.dispose() }
  );
}

/**
 * 扩展停用入口
 */
export function deactivate(): void {
  // 资源会通过 subscriptions 自动释放
}
