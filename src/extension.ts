/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 * @Author       : frostime
 * @Date         : 2025-04-18 15:05:28
 * @FilePath     : /src/extension.ts
 * @LastEditTime : 2025-05-05 16:04:07
 * @Description  :
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { PromptManager } from './promptManager';
import { PromptTreeProvider } from './promptTreeProvider';
import { StatusBarController } from './statusBarController';
import { registerCommands } from './commandHandler';

export function activate(context: vscode.ExtensionContext) {
	// 读取配置
	const config = vscode.workspace.getConfiguration('filesToPrompt');
	const fileTemplate = config.get<string>('fileTemplate', '```{{FilePath}}\n{{Content}}\n```');
	const baseTemplate = config.get<string>('baseTemplate', '### Codes ###\n\nOutlines:\n\n{{FilePathList}}\n\nContent:\n\n{{FilesPrompts}}');
	const sortOrder = config.get<'openingOrder' | 'filePath'>('sortOrder', 'openingOrder');

	// 创建 PromptManager 实例
	const promptManager = new PromptManager(fileTemplate, baseTemplate);

	// 创建 TreeView
	const promptTreeProvider = new PromptTreeProvider(promptManager);
	const treeView = vscode.window.createTreeView('promptItemsView', {
		treeDataProvider: promptTreeProvider,
		dragAndDropController: promptTreeProvider,
		showCollapseAll: true
	});

	// 创建状态栏控制器
	const statusBarController = new StatusBarController(promptManager);

	// 注册新命令
	registerCommands(context, promptManager, promptTreeProvider, statusBarController);

	// 注册原有命令 - 一键合并所有打开的文件
	let disposable = vscode.commands.registerCommand('files-to-prompt.openedFiles', async () => {
		try {
			// 获取所有打开的文档（包括所有标签页）
			const openDocuments = vscode.workspace.textDocuments;

			if (openDocuments.length === 0) {
				vscode.window.showInformationMessage('No files are open to merge');
				return;
			}

			let prompts: { path: string, prompt: string, index: number }[] = [];

			for (const [index, document] of openDocuments.entries()) {
				// 跳过未保存到文件系统的文档（如：无标题文档）
				if (document.uri.scheme !== 'file') {
					continue;
				}

				const filePath = document.uri.fsPath;
				const content = document.getText();
				const fileName = path.basename(filePath);
				const fileExt = path.extname(filePath).substring(1);

				// 获取相对路径
				let relativePath = filePath;
				if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
					const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
					if (workspaceFolder) {
						relativePath = filePath.substring(workspaceFolder.uri.fsPath.length + 1);
					}
				}

				// 使用模板替换变量
				const fileContent = fileTemplate
					.replace(/{{Content}}/g, content)
					.replace(/{{FilePath}}/g, relativePath)
					.replace(/{{FileName}}/g, fileName)
					.replace(/{{FileExt}}/g, fileExt);

				prompts.push({
					path: relativePath,
					prompt: fileContent,
					index: index
				});
			}

			if (sortOrder === 'filePath') {
				prompts.sort((a, b) => a.path.localeCompare(b.path));
			} else {
				prompts.sort((a, b) => a.index - b.index);
			}

			const filePathList = prompts.map(p => p.path).map(p => `- ${p}`).join('\n');

			const mergedContent = prompts.map(p => p.prompt).join('\n\n');

			// 应用基础模板
			const finalContent = baseTemplate.replace(/{{FilesPrompts}}/g, mergedContent).replace(/{{FilePathList}}/g, filePathList);

			// 创建并显示新文档
			const newDocument = await vscode.workspace.openTextDocument({
				content: finalContent,
				language: 'markdown'
			});

			await vscode.window.showTextDocument(newDocument, { preview: false });

		} catch (error) {
			vscode.window.showErrorMessage(`Failed to merge files: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	context.subscriptions.push(
		disposable,
		treeView,
		statusBarController
	);
}

export function deactivate() { }
