/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { PromptManager } from './promptManager';
import { PromptTreeProvider, PromptItemNode } from './promptTreeProvider';
import { StatusBarController } from './statusBarController';

export function registerCommands(
  context: vscode.ExtensionContext,
  promptManager: PromptManager,
  _treeProvider: PromptTreeProvider,
  _statusBarController: StatusBarController
) {

  // 注册命令 - 添加文件到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.addFileToPrompt', async (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => {
      // 当从 explorer context menu 触发时:
      // - contextSelection: 右键点击的文件 (单个 URI)
      // - allSelections: 所有选中的文件 (URI 数组)
      
      // 处理从 explorer context menu 多选触发的情况
      if (allSelections && allSelections.length > 0) {
        for (const uri of allSelections) {
          await promptManager.addFile(uri);
        }
      }
      // 处理单个文件的情况
      else if (contextSelection) {
        await promptManager.addFile(contextSelection);
      }
      // 处理没有参数的情况（从命令面板或其他地方触发）
      else {
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
      }

      // 自动显示 Prompt 面板
      vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');
    })
  );

  // 注册命令 - 添加选中内容到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.addSelectionToPrompt', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && !editor.selection.isEmpty) {
        // const title = await vscode.window.showInputBox({
        //   prompt: '为代码片段添加标题（可选）'
        // });
        promptManager.addSnippet(editor.document, editor.selection);

        // 自动显示 Prompt 面板
        vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');
      } else {
        vscode.window.showWarningMessage('请先选择代码片段');
      }
    })
  );

  // 注册命令 - 从 prompt 集合中删除项目
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.removeItemFromPrompt', (node: PromptItemNode) => {
      if (node) {
        promptManager.removeItem(node.id);
      }
    })
  );

  // 注册命令 - 上移项目
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.moveItemUp', (node: PromptItemNode) => {
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
    vscode.commands.registerCommand('assemble-code-to-prompt.moveItemDown', (node: PromptItemNode) => {
      if (node) {
        const items = promptManager.getItems();
        const index = items.findIndex(item => item.id === node.id);
        if (index < items.length - 1) {
          promptManager.reorderItems(index, index + 1);
        }
      }
    })
  );

  // 注册命令 - 添加终端输出到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.addTerminalOutputToPrompt', async () => {
      await promptManager.addTerminalOutput();

      // 自动显示 Prompt 面板
      vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');
    })
  );

  // 注册命令 - 添加文件夹树结构到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.addFolderTreeToPrompt', async (uri?: vscode.Uri) => {
      if (uri) {
        await promptManager.addFolderTree(uri);
      } else {
        // 如果没有提供 URI，显示文件夹选择对话框
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: '添加文件夹树结构'
        });

        if (uris && uris.length > 0) {
          await promptManager.addFolderTree(uris[0]);
        }
      }

      // 自动显示 Prompt 面板
      vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');
    })
  );

  // 注册命令 - 清空 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.clearPromptItems', () => {
      promptManager.clear();
    })
  );

  // 注册命令 - 生成最终的 prompt
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.generatePrompt', async () => {
      const prompt = await promptManager.generatePrompt('openingOrder');

      // 创建并显示新文档
      const newDocument = await vscode.workspace.openTextDocument({
        content: prompt,
        language: 'markdown'
      });

      await vscode.window.showTextDocument(newDocument, { preview: false });
    })
  );

  // 注册命令 - 添加全局 git diff --cached 到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.addGitDiffCachedToPrompt', async () => {
      await promptManager.addGitDiffCached();

      // 自动显示 Prompt 面板
      vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');
    })
  );

  // 注册命令 - 添加文件级别的 git diff --cached 到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.addGitDiffFileToPrompt', async (uri?: vscode.Uri) => {
      if (uri) {
        await promptManager.addGitDiffFile(uri);
      } else {
        // 检查是否从编辑器标签页调用
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.scheme === 'file') {
          await promptManager.addGitDiffFile(activeEditor.document.uri);
        } else {
          // 如果没有活动编辑器或不是文件，显示文件选择对话框
          const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: '添加文件 Git Diff'
          });
          if (uris && uris.length > 0) {
            await promptManager.addGitDiffFile(uris[0]);
          }
        }
      }

      // 自动显示 Prompt 面板
      vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');
    })
  );

  // 注册命令 - 一键合并所有打开的文件
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.addOpenedFilesToPrompt', async () => {
      try {
        // 获取所有打开的文档（包括所有标签页）
        const openDocuments = vscode.workspace.textDocuments;

        if (openDocuments.length === 0) {
          vscode.window.showInformationMessage('没有打开的文件可以合并');
          return;
        }

        // 将所有打开的文件添加到 PromptManager
        for (const document of openDocuments) {
          // 跳过未保存到文件系统的文档（如：无标题文档）
          if (document.uri.scheme !== 'file') {
            continue;
          }

          await promptManager.addFile(document.uri);
        }



        // 显示 TreeView
        vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');

        // // 生成 prompt
        // const prompt = promptManager.generatePrompt('openingOrder');

        // // 创建并显示新文档
        // const newDocument = await vscode.workspace.openTextDocument({
        //   content: prompt,
        //   language: 'markdown'
        // });

        // await vscode.window.showTextDocument(newDocument, { preview: false });

        // vscode.window.showInformationMessage(`已将 ${promptManager.getItems().length} 个文件添加到 Prompt 集合并生成 Prompt`);
      } catch (error) {
        vscode.window.showErrorMessage(`合并文件失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    })
  );

  // 注册命令 - 添加用户指令到 prompt 集合
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.addUserInstructionToPrompt', async () => {
      await promptManager.addUserInstruction();

      // 自动显示 Prompt 面板
      vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');
    })
  );

  // 注册命令 - 编辑静态项目内容
  context.subscriptions.push(
    vscode.commands.registerCommand('assemble-code-to-prompt.editStaticPromptItem', async (node: PromptItemNode) => {
      if (node && node.item) {
        await promptManager.editStaticItem(node.item.id);
      } else {
        vscode.window.showErrorMessage('无法获取项目信息');
      }
    })
  );
}
