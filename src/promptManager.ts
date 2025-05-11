/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 表示添加到 prompt 集合中的单个项目
export interface PromptItem {
  id: string;                    // 唯一标识符
  type: 'file' | 'snippet' | 'terminal' | 'tree';  // 类型：文件、代码片段、终端输出或文件夹树
  title: string;                 // 标题或描述
  content: string;               // 内容
  filePath?: string;             // 文件路径（如果适用）
  language?: string;             // 语言（用于语法高亮）
  lineStart?: number;            // 代码片段的起始行（如果适用）
  lineEnd?: number;              // 代码片段的结束行（如果适用）
  index: number;                 // 用于排序
}

export class PromptManager {
  private items: PromptItem[] = [];
  private _onDidChangeItems = new vscode.EventEmitter<void>();
  readonly onDidChangeItems = this._onDidChangeItems.event;

  constructor() {}

  // 添加文件或目录
  async addFile(uri: vscode.Uri): Promise<void> {
    try {
      const filePath = uri.fsPath;
      const stats = await fs.promises.stat(filePath);

      // 如果是目录，递归添加目录下的所有文件
      if (stats.isDirectory()) {
        await this.addDirectory(uri);
        return;
      }

      // 处理单个文件
      const document = await vscode.workspace.openTextDocument(uri);
      const content = document.getText();

      // 获取相对路径
      const relativePath = this.getRelativePath(uri);

      const fileName = path.basename(filePath);

      // 检查是否已存在相同路径的文件
      const existingItem = this.items.find(item =>
        item.type === 'file' && item.filePath === relativePath
      );

      if (existingItem) {
        vscode.window.setStatusBarMessage(`文件已存在: ${fileName}`, 3000);
        return;
      }

      const item: PromptItem = {
        id: uuidv4(),
        type: 'file',
        title: fileName,
        content: content,
        filePath: relativePath,
        language: document.languageId,
        index: this.items.length
      };

      this.items.push(item);
      this._onDidChangeItems.fire();

      vscode.window.setStatusBarMessage(`已添加文件: ${fileName}`, 3000);
    } catch (error) {
      vscode.window.showErrorMessage(`添加文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 递归添加目录下的所有文件
  private async addDirectory(uri: vscode.Uri): Promise<number> {
    try {
      const dirPath = uri.fsPath;
      const dirName = path.basename(dirPath);

      // 读取目录内容
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      let addedCount = 0;

      // 处理每个条目
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        const entryUri = vscode.Uri.file(entryPath);

        if (entry.isDirectory()) {
          // 递归处理子目录，但不累计子目录的文件数量到当前目录
          await this.addDirectory(entryUri);
        } else if (entry.isFile()) {
          try {
            // 检查文件是否已存在
            const relativePath = this.getRelativePath(entryUri);
            const existingItem = this.items.find(item =>
              item.type === 'file' && item.filePath === relativePath
            );

            if (!existingItem) {
              // 尝试添加文件，但不显示每个文件的消息
              const document = await vscode.workspace.openTextDocument(entryUri);
              const content = document.getText();
              const fileName = path.basename(entryPath);

              const item: PromptItem = {
                id: uuidv4(),
                type: 'file',
                title: fileName,
                content: content,
                filePath: relativePath,
                language: document.languageId,
                index: this.items.length
              };

              this.items.push(item);
              this._onDidChangeItems.fire();
              addedCount++;
            }
          } catch (error) {
            // 忽略无法添加的文件（如二进制文件）
            console.log(`无法添加文件 ${entryPath}: ${error}`);
          }
        }
      }

      if (addedCount > 0) {
        vscode.window.setStatusBarMessage(`已从目录 ${dirName} 添加 ${addedCount} 个文件`, 3000);
      } else {
        vscode.window.setStatusBarMessage(`目录 ${dirName} 中没有找到可添加的文件`, 3000);
      }

      return addedCount;
    } catch (error) {
      vscode.window.showErrorMessage(`处理目录失败: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  // 获取相对路径的辅助方法
  private getRelativePath(uri: vscode.Uri): string {
    const filePath = uri.fsPath;
    let relativePath = filePath;

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (workspaceFolder) {
        relativePath = filePath.substring(workspaceFolder.uri.fsPath.length + 1);
      }
    }

    return relativePath;
  }

  // 添加代码片段
  addSnippet(document: vscode.TextDocument, selection: vscode.Selection, title?: string): void {
    try {
      const content = document.getText(selection);

      // 获取相对路径
      const relativePath = this.getRelativePath(document.uri);

      const lineStart = selection.start.line + 1;
      const lineEnd = selection.end.line + 1;

      // 检查是否已存在相同的代码片段
      const existingItem = this.items.find(item =>
        item.type === 'snippet' &&
        item.filePath === relativePath &&
        item.lineStart === lineStart &&
        item.lineEnd === lineEnd
      );

      if (existingItem) {
        vscode.window.setStatusBarMessage(`代码片段已存在: ${existingItem.title}`, 3000);
        return;
      }

      const item: PromptItem = {
        id: uuidv4(),
        type: 'snippet',
        title: title || '',
        content: content,
        filePath: relativePath,
        language: document.languageId,
        lineStart: lineStart,
        lineEnd: lineEnd,
        index: this.items.length
      };

      this.items.push(item);
      this._onDidChangeItems.fire();

      vscode.window.setStatusBarMessage(`已添加代码片段: ${item.title}`, 3000);
    } catch (error) {
      vscode.window.showErrorMessage(`添加代码片段失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 添加终端输出
  async addTerminalOutput(): Promise<void> {
    try {
      const terminal = vscode.window.activeTerminal;
      if (!terminal) {
        vscode.window.showWarningMessage('没有活动的终端');
        return;
      }

      // 获取终端名称
      const terminalName = terminal.name;

      try {
        // 尝试执行 VS Code 的复制命令
        await vscode.commands.executeCommand('workbench.action.terminal.copyLastCommandAndLastCommandOutput');

        // 给一点时间让复制操作完成
        await new Promise(resolve => setTimeout(resolve, 300));

        // 使用 VS Code 内置的剪贴板 API 读取内容
        const output = await vscode.env.clipboard.readText();

        if (!output || !output.trim()) {
          vscode.window.showWarningMessage('无法获取终端输出，剪贴板为空');
          return;
        }

        // 创建并添加终端输出项
        const item: PromptItem = {
          id: uuidv4(),
          type: 'terminal',
          title: `Terminal: ${terminalName}`,
          content: output,
          index: this.items.length
        };

        this.items.push(item);
        this._onDidChangeItems.fire();

        vscode.window.setStatusBarMessage(`已添加终端输出: ${terminalName}`, 3000);
      } catch (err) {
        console.error('获取终端输出失败:', err);

        // 如果自动获取失败，提示用户手动输入
        const output = await vscode.window.showInputBox({
          prompt: '无法自动获取终端输出，请手动复制并粘贴到此处',
          placeHolder: '终端输出内容'
        });

        if (!output || !output.trim()) {
          return;
        }

        // 创建并添加终端输出项
        const item: PromptItem = {
          id: uuidv4(),
          type: 'terminal',
          title: `Terminal: ${terminalName}`,
          content: output,
          index: this.items.length
        };

        this.items.push(item);
        this._onDidChangeItems.fire();

        vscode.window.setStatusBarMessage(`已添加终端输出: ${terminalName}`, 3000);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`添加终端输出失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 添加文件夹树结构
  async addFolderTree(uri: vscode.Uri): Promise<void> {
    try {
      const folderPath = uri.fsPath;
      const stats = await fs.promises.stat(folderPath);

      if (!stats.isDirectory()) {
        vscode.window.showWarningMessage('请选择一个文件夹');
        return;
      }

      const folderName = path.basename(folderPath);
      const relativePath = this.getRelativePath(uri);

      // 生成文件夹树结构
      const treeContent = await this.generateFolderTree(uri);

      const item: PromptItem = {
        id: uuidv4(),
        type: 'tree',
        title: `Tree: ${folderName}`,
        content: treeContent,
        filePath: relativePath,
        index: this.items.length
      };

      this.items.push(item);
      this._onDidChangeItems.fire();

      vscode.window.setStatusBarMessage(`已添加文件夹树结构: ${folderName}`, 3000);
    } catch (error) {
      vscode.window.showErrorMessage(`添加文件夹树结构失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 生成文件夹树结构
  private async generateFolderTree(uri: vscode.Uri, prefix: string = ''): Promise<string> {
    const folderPath = uri.fsPath;
    const folderName = path.basename(folderPath);
    let result = prefix ? `${prefix}${folderName}/\n` : `${folderName}/\n`;

    try {
      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

      // 排序：先目录，后文件
      const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) {
          return -1;
        }
        if (!a.isDirectory() && b.isDirectory()) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      });

      const lastIndex = sortedEntries.length - 1;

      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const isLast = i === lastIndex;
        const entryPath = path.join(folderPath, entry.name);
        const entryUri = vscode.Uri.file(entryPath);

        // 确定当前项的前缀
        const currentPrefix = prefix + (isLast ? '└── ' : '├── ');
        // 确定子项的前缀
        const childPrefix = prefix + (isLast ? '    ' : '│   ');

        if (entry.isDirectory()) {
          // 递归处理子目录
          const subTree = await this.generateFolderTree(entryUri, childPrefix);
          result += currentPrefix + subTree;
        } else {
          // 添加文件
          result += `${currentPrefix}${entry.name}\n`;
        }
      }

      return result;
    } catch (error) {
      console.error(`生成文件夹树结构失败: ${error}`);
      return `${result}  [Error: 无法读取目录内容]\n`;
    }
  }

  // 删除项目
  removeItem(id: string): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      const item = this.items[index];
      this.items.splice(index, 1);

      // 更新索引
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].index = i;
      }

      this._onDidChangeItems.fire();
      vscode.window.setStatusBarMessage(`已删除: ${item.title}`, 3000);
    }
  }

  // 重新排序
  reorderItems(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.items.length || toIndex < 0 || toIndex >= this.items.length) {
      return;
    }

    const item = this.items[fromIndex];
    this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, item);

    // 更新索引
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].index = i;
    }

    this._onDidChangeItems.fire();
  }

  // 清空集合
  clear(): void {
    this.items = [];
    this._onDidChangeItems.fire();
    vscode.window.setStatusBarMessage('已清空 Prompt 集合', 3000);
  }

  // 获取所有项目
  getItems(): PromptItem[] {
    return [...this.items];
  }

  // 生成最终的 prompt
  generatePrompt(sortOrder: 'openingOrder' | 'filePath' = 'openingOrder'): string {
    if (this.items.length === 0) {
      return '没有选择任何文件或代码片段';
    }

    // 按类型分组
    const fileItems = this.items.filter(item => item.type === 'file' || item.type === 'snippet');
    const terminalItems = this.items.filter(item => item.type === 'terminal');
    const treeItems = this.items.filter(item => item.type === 'tree');

    let finalPrompt = '';

    // 1. 添加终端输出部分
    if (terminalItems.length > 0) {
      finalPrompt += `### Terminal Output ###\n\n`;
      for (const item of terminalItems) {
        finalPrompt += `${item.title}\n\`\`\`\n${item.content}\n\`\`\`\n\n`;
      }
    }

    // 2. 添加文件夹结构部分
    if (treeItems.length > 0) {
      finalPrompt += `### Folder Structure ###\n\n`;
      for (const item of treeItems) {
        finalPrompt += `${item.title}\n\`\`\`\n${item.content}\n\`\`\`\n\n`;
      }
    }

    // 3. 处理代码项目
    if (fileItems.length > 0) {
      let codePrompts: { path: string, prompt: string, index: number }[] = [];

      for (const item of fileItems) {
        if (item.type === 'file') {
          const fileContent = '```' + (item.language || '') + '\n' + item.content + '\n```';
          codePrompts.push({
            path: item.filePath || '',
            prompt: `文件: ${item.filePath || ''}\n${fileContent}`,
            index: item.index
          });
        } else if (item.type === 'snippet') {
          const snippetContent = '```' + (item.language || '') + '\n' + item.content + '\n```';
          codePrompts.push({
            path: `${item.filePath || ''} (lines ${item.lineStart}-${item.lineEnd})`,
            prompt: `代码片段: ${item.filePath || ''} (lines ${item.lineStart}-${item.lineEnd})\n${snippetContent}`,
            index: item.index
          });
        }
      }

      // 排序代码项目
      if (sortOrder === 'filePath') {
        codePrompts.sort((a, b) => a.path.localeCompare(b.path));
      } else {
        codePrompts.sort((a, b) => a.index - b.index);
      }

      // 生成文件路径列表和合并的代码内容
      const filePathList = codePrompts.map(p => p.path).map(p => `- ${p}`).join('\n');
      const mergedCodeContent = codePrompts.map(p => p.prompt).join('\n\n');

      // 添加代码部分
      finalPrompt += `### Code ###\n\nOutlines:\n\n${filePathList}\n\nContent:\n\n${mergedCodeContent}\n\n`;
    }

    return finalPrompt.trim();
  }
}
