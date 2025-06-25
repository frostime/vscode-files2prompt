/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

// 表示添加到 prompt 集合中的单个项目
export interface PromptItem {
  id: string;                    // 唯一标识符
  type: 'file' | 'snippet' | 'terminal' | 'tree' | 'git-diff';  // 类型：文件、代码片段、终端输出、文件夹树或Git差异
  title: string;                 // 标题或描述
  content: string | (() => Promise<string>);               // 内容
  filePath?: string;             // 文件路径（如果适用）
  language?: string;             // 语言（用于语法高亮）
  lineStart?: number;            // 代码片段的起始行（如果适用）
  lineEnd?: number;              // 代码片段的结束行（如果适用）
  index: number;                 // 用于排序
  mode: 'static' | 'dynamic';    // 静态或动态
}

export class PromptManager {
  private items: PromptItem[] = [];
  private _onDidChangeItems = new vscode.EventEmitter<void>();
  readonly onDidChangeItems = this._onDidChangeItems.event;

  constructor() { }

  // 动态内容生成函数
  private createDynamicFileContentGenerator(uri: vscode.Uri): () => Promise<string> {
    return async () => {
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        return document.getText();
      } catch (error) {
        throw new Error(`无法读取文件: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
  }

  private createDynamicTreeContentGenerator(uri: vscode.Uri): () => Promise<string> {
    return async () => {
      try {
        return await this.generateFolderTree(uri);
      } catch (error) {
        throw new Error(`无法生成目录树: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
  }

  private createDynamicGitDiffContentGenerator(uri?: vscode.Uri): () => Promise<string> {
    return async () => {
      try {
        // 获取 Git 扩展
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
          return '错误: Git 扩展未启用';
        }

        const git = gitExtension.getAPI(1);
        if (!git) {
          return '错误: 无法获取 Git API';
        }

        // 获取工作区根目录
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
          return '错误: 没有打开的工作区';
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

        // 查找对应的 Git 仓库
        const repository = git.repositories.find((repo: any) =>
          workspaceRoot.startsWith(repo.rootUri.fsPath)
        );

        if (!repository) {
          return '错误: 当前目录不是 Git 仓库';
        }

        // 获取暂存区的更改
        const indexChanges = repository.state.indexChanges;

        if (!indexChanges || indexChanges.length === 0) {
          return '没有暂存的更改';
        }

        let diffContent = '';

        // 如果指定了特定文件
        if (uri) {
          const relativePath = this.getRelativePath(uri);
          const targetChange = indexChanges.find((change: any) =>
            change.uri.fsPath === uri.fsPath
          );

          if (!targetChange) {
            return `文件 ${relativePath} 没有暂存的更改`;
          }

          // 获取单个文件的 diff
          try {
            const diff = await repository.diffIndexWith('HEAD', targetChange.uri.fsPath);
            diffContent = diff || '无法获取文件差异';
          } catch (error) {
            diffContent = `获取文件差异失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        } else {
          // 获取所有暂存文件的信息
          diffContent = '暂存的更改:\n\n';

          for (const change of indexChanges) {
            const relativePath = vscode.workspace.asRelativePath(change.uri);
            let status = '';

            switch (change.status) {
              case 0: status = 'INDEX_MODIFIED'; break;
              case 1: status = 'INDEX_ADDED'; break;
              case 2: status = 'INDEX_DELETED'; break;
              case 3: status = 'INDEX_RENAMED'; break;
              case 4: status = 'INDEX_COPIED'; break;
              default: status = 'UNKNOWN';
            }

            diffContent += `${status}: ${relativePath}\n`;

            // 尝试获取每个文件的 diff（可选，可能影响性能）
            try {
              const fileDiff = await repository.diffIndexWith('HEAD', change.uri.fsPath);
              if (fileDiff) {
                diffContent += `\n${fileDiff}\n${'='.repeat(50)}\n`;
              }
            } catch (error) {
              diffContent += `  (无法获取详细差异: ${error instanceof Error ? error.message : String(error)})\n`;
            }
          }
        }

        return diffContent || '没有可显示的差异内容';

      } catch (error) {
        console.error('Git diff 生成失败:', error);
        return `[Error: 无法生成动态内容 - Git diff 生成失败: ${error instanceof Error ? error.message : String(error)}]`;
      }
    };
  }

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
        content: this.createDynamicFileContentGenerator(uri),
        filePath: relativePath,
        language: document.languageId,
        index: this.items.length,
        mode: 'dynamic'
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
              const fileName = path.basename(entryPath);

              const item: PromptItem = {
                id: uuidv4(),
                type: 'file',
                title: fileName,
                content: this.createDynamicFileContentGenerator(entryUri),
                filePath: relativePath,
                language: document.languageId,
                index: this.items.length,
                mode: 'dynamic'
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
        vscode.window.setStatusBarMessage(`代码片段已存在`, 3000);
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
        index: this.items.length,
        mode: 'static'
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
          index: this.items.length,
          mode: 'static'
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
          index: this.items.length,
          mode: 'static'
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
        content: this.createDynamicTreeContentGenerator(uri),
        filePath: relativePath,
        index: this.items.length,
        mode: 'dynamic'
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

  // 添加全局 git diff --cached
  async addGitDiffCached(): Promise<void> {
    try {
      // 获取工作区根目录
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('没有打开的工作区');
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // 创建临时文件路径
      const tempFilePath = path.join(os.tmpdir(), `git-diff-cached-${Date.now()}.txt`);

      // 执行 git diff --cached 命令并重定向到临时文件
      const { error, stdout, stderr } = await new Promise<{ error: Error | null, stdout: string, stderr: string }>(resolve => {
        const process = require('child_process').exec(
          `git -C "${workspaceRoot}" diff --cached > "${tempFilePath}"`,
          (error: Error | null, stdout: string, stderr: string) => {
            resolve({ error, stdout, stderr });
          }
        );
      });

      if (error) {
        vscode.window.showErrorMessage(`执行 git diff 命令失败: ${stderr || error.message}`);
        return;
      }

      // 读取临时文件内容
      let output = '';
      try {
        output = await fs.promises.readFile(tempFilePath, 'utf8');
        // 清理临时文件
        await fs.promises.unlink(tempFilePath);
      } catch (readError) {
        vscode.window.showErrorMessage(`读取 git diff 输出失败: ${readError instanceof Error ? readError.message : String(readError)}`);
        return;
      }

      if (!output || !output.trim()) {
        vscode.window.showInformationMessage('没有已暂存的更改');
        return;
      }

      // 创建并添加 git diff 项目
      const item: PromptItem = {
        id: uuidv4(),
        type: 'git-diff',
        title: 'Git Diff (--cached)',
        content: this.createDynamicGitDiffContentGenerator(),
        index: this.items.length,
        mode: 'dynamic'
      };

      this.items.push(item);
      this._onDidChangeItems.fire();

      vscode.window.setStatusBarMessage('已添加全局 Git Diff (--cached)', 3000);
    } catch (error) {
      vscode.window.showErrorMessage(`添加 Git Diff 失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 添加文件级别的 git diff --cached
  async addGitDiffFile(uri: vscode.Uri): Promise<void> {
    try {
      const filePath = uri.fsPath;
      const fileName = path.basename(filePath);
      const relativePath = this.getRelativePath(uri);

      // 获取工作区根目录
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('没有打开的工作区');
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // 创建临时文件路径
      const tempFilePath = path.join(os.tmpdir(), `git-diff-file-${Date.now()}.txt`);

      // 执行 git diff --cached 命令并重定向到临时文件
      const { error, stdout, stderr } = await new Promise<{ error: Error | null, stdout: string, stderr: string }>(resolve => {
        const process = require('child_process').exec(
          `git -C "${workspaceRoot}" diff --cached -- "${relativePath}" > "${tempFilePath}"`,
          (error: Error | null, stdout: string, stderr: string) => {
            resolve({ error, stdout, stderr });
          }
        );
      });

      if (error) {
        vscode.window.showErrorMessage(`执行 git diff 命令失败: ${stderr || error.message}`);
        return;
      }

      // 读取临时文件内容
      let output = '';
      try {
        output = await fs.promises.readFile(tempFilePath, 'utf8');
        // 清理临时文件
        await fs.promises.unlink(tempFilePath);
      } catch (readError) {
        vscode.window.showErrorMessage(`读取 git diff 输出失败: ${readError instanceof Error ? readError.message : String(readError)}`);
        return;
      }

      if (!output || !output.trim()) {
        vscode.window.showInformationMessage(`文件 ${fileName} 没有已暂存的更改`);
        return;
      }

      // 创建并添加 git diff 项目
      const item: PromptItem = {
        id: uuidv4(),
        type: 'git-diff',
        title: `Git Diff: ${fileName}`,
        content: this.createDynamicGitDiffContentGenerator(uri),
        filePath: relativePath,
        index: this.items.length,
        mode: 'dynamic'
      };

      this.items.push(item);
      this._onDidChangeItems.fire();

      vscode.window.setStatusBarMessage(`已添加文件 Git Diff: ${fileName}`, 3000);
    } catch (error) {
      vscode.window.showErrorMessage(`添加文件 Git Diff 失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 解析内容（静态或动态）
  private async resolveContent(item: PromptItem): Promise<string> {
    if (typeof item.content === 'string') {
      return item.content;
    } else {
      try {
        return await item.content();
      } catch (error) {
        console.error(`动态内容生成失败 (${item.title}):`, error);
        return `[Error: 无法生成动态内容 - ${error instanceof Error ? error.message : String(error)}]`;
      }
    }
  }

  // 生成最终的 prompt
  async generatePrompt(sortOrder: 'openingOrder' | 'filePath' = 'openingOrder'): Promise<string> {
    if (this.items.length === 0) {
      return '没有选择任何文件或代码片段';
    }

    // 按类型分组
    const fileItems = this.items.filter(item => item.type === 'file' || item.type === 'snippet');
    const terminalItems = this.items.filter(item => item.type === 'terminal');
    const treeItems = this.items.filter(item => item.type === 'tree');
    const gitDiffItems = this.items.filter(item => item.type === 'git-diff');

    let finalPrompt = '';

    // 1. 添加终端输出部分
    if (terminalItems.length > 0) {
      finalPrompt += `### Terminal Output ###\n\n`;
      for (const item of terminalItems) {
        const content = await this.resolveContent(item);
        finalPrompt += `${item.title}\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }
    }

    // 2. 添加文件夹结构部分
    if (treeItems.length > 0) {
      finalPrompt += `### Folder Structure ###\n\n`;
      for (const item of treeItems) {
        const content = await this.resolveContent(item);
        finalPrompt += `${item.title}\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }
    }

    // 3. 添加 Git Diff 部分
    if (gitDiffItems.length > 0) {
      finalPrompt += `### Git Diff (--cached) ###\n\n`;
      for (const item of gitDiffItems) {
        const content = await this.resolveContent(item);
        finalPrompt += `${item.title}\n\`\`\`diff\n${content}\n\`\`\`\n\n`;
      }
    }

    // 4. 处理代码项目
    if (fileItems.length > 0) {
      let codePrompts: { path: string, prompt: string, index: number }[] = [];

      for (const item of fileItems) {
        const content = await this.resolveContent(item);

        if (item.type === 'file') {
          const fileContent = '```' + (item.language || '') + '\n' + content + '\n```';
          codePrompts.push({
            path: item.filePath || '',
            prompt: `文件: ${item.filePath || ''}\n${fileContent}`,
            index: item.index
          });
        } else if (item.type === 'snippet') {
          const snippetContent = '```' + (item.language || '') + '\n' + content + '\n```';
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
