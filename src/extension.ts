/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 * @Author       : frostime
 * @Date         : 2025-04-18 15:05:28
 * @FilePath     : /src/extension.ts
 * @LastEditTime : 2025-05-05 16:09:14
 * @Description  :
 */
import * as vscode from 'vscode';
import { PromptManager } from './promptManager';
import { PromptTreeProvider } from './promptTreeProvider';
import { StatusBarController } from './statusBarController';
import { registerCommands } from './commandHandler';

export function activate(context: vscode.ExtensionContext) {
	// 创建 PromptManager 实例
	const promptManager = new PromptManager();

	// 创建 TreeView
	const promptTreeProvider = new PromptTreeProvider(promptManager);
	const treeView = vscode.window.createTreeView('promptItemsView', {
		treeDataProvider: promptTreeProvider,
		dragAndDropController: promptTreeProvider,
		showCollapseAll: true
	});

	// 创建状态栏控制器
	const statusBarController = new StatusBarController(promptManager);

	// 注册所有命令
	registerCommands(context, promptManager, promptTreeProvider, statusBarController);

	context.subscriptions.push(
		treeView,
		statusBarController
	);
}

export function deactivate() { }
