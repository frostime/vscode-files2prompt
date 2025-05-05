/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { PromptManager } from './promptManager';
import { PromptTreeProvider, PromptItemNode } from './promptTreeProvider';
import { StatusBarController } from './statusBarController';

export function registerCommands(
  context: vscode.ExtensionContext,
  promptManager: PromptManager,
  treeProvider: PromptTreeProvider,
  statusBarController: StatusBarController
) {
  // 注册命令 - 开始拼接 prompt 模式
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.startCollecting', () => {
      statusBarController.startCollecting();
      vscode.commands.executeCommand('workbench.view.extension.promptItemsView');
      vscode.window.showInformationMessage('已进入拼接 Prompt 模式，您可以添加文件或代码片段');
    })
  );

  // 注册命令 - 结束拼接 prompt 模式
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.stopCollecting', () => {
      statusBarController.stopCollecting();
      vscode.window.showInformationMessage('已退出拼接 Prompt 模式');
    })
  );

  // 注册命令 - 显示 prompt 面板
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.showPromptPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.promptItemsView');
    })
  );

  // 注册命令 - 添加文件到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.addFileToPrompt', async (uri: vscode.Uri) => {
      if (!uri) {
        // 检查是否从编辑器标签页调用
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.scheme === 'file') {
          await promptManager.addFile(activeEditor.document.uri);
        } else {
          // 如果没有活动编辑器或不是文件，显示文件选择对话框
          const uris = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: '添加到 Prompt'
          });
          if (uris && uris.length > 0) {
            for (const uri of uris) {
              await promptManager.addFile(uri);
            }
          }
        }
      } else {
        await promptManager.addFile(uri);
      }

      // 如果不在收集模式，自动开始收集
      statusBarController.startCollecting();
    })
  );

  // 注册命令 - 添加选中内容到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.addSelectionToPrompt', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && !editor.selection.isEmpty) {
        const title = await vscode.window.showInputBox({
          prompt: '为代码片段添加标题（可选）'
        });
        promptManager.addSnippet(editor.document, editor.selection, title || undefined);

        // 如果不在收集模式，自动开始收集
        statusBarController.startCollecting();
      } else {
        vscode.window.showWarningMessage('请先选择代码片段');
      }
    })
  );

  // 注册命令 - 从 prompt 集合中删除项目
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.removeItemFromPrompt', (node: PromptItemNode) => {
      if (node) {
        promptManager.removeItem(node.id);
      }
    })
  );

  // 注册命令 - 上移项目
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.moveItemUp', (node: PromptItemNode) => {
      if (node) {
        const items = promptManager.getItems();
        const index = items.findIndex(item => item.id === node.id);
        if (index > 0) {
          promptManager.reorderItems(index, index - 1);
        }
      }
    })
  );

  // 注册命令 - 下移项目
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.moveItemDown', (node: PromptItemNode) => {
      if (node) {
        const items = promptManager.getItems();
        const index = items.findIndex(item => item.id === node.id);
        if (index < items.length - 1) {
          promptManager.reorderItems(index, index + 1);
        }
      }
    })
  );

  // 注册命令 - 清空 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.clearPromptItems', () => {
      promptManager.clear();
    })
  );

  // 注册命令 - 生成最终的 prompt
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.generatePrompt', async () => {
      const config = vscode.workspace.getConfiguration('filesToPrompt');
      const sortOrder = config.get<'openingOrder' | 'filePath'>('sortOrder', 'openingOrder');

      const prompt = promptManager.generatePrompt(sortOrder);

      // 创建并显示新文档
      const newDocument = await vscode.workspace.openTextDocument({
        content: prompt,
        language: 'markdown'
      });

      await vscode.window.showTextDocument(newDocument, { preview: false });
    })
  );

  // 注册命令 - 预览 prompt 项目
  context.subscriptions.push(
    vscode.commands.registerCommand('files-to-prompt.previewPromptItem', async (item) => {
      if (item) {
        // 创建并显示预览文档
        const newDocument = await vscode.workspace.openTextDocument({
          content: item.content,
          language: item.language || 'plaintext'
        });

        await vscode.window.showTextDocument(newDocument, { preview: true });
      }
    })
  );
}
