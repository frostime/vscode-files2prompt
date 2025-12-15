/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { GitDiffPromptItem } from '../types';
import { BaseContentProvider, ProviderContext } from './IContentProvider';

/**
 * Git 仓库接口（VS Code Git 扩展 API）
 */
interface GitRepository {
  rootUri: vscode.Uri;
  state: {
    indexChanges: Array<{
      uri: vscode.Uri;
      status: number;
    }>;
  };
  diffIndexWith(ref: string, path: string): Promise<string>;
}

/**
 * Git 扩展 API 接口
 */
interface GitAPI {
  repositories: GitRepository[];
}

/**
 * Git Diff 内容提供者
 */
export class GitDiffProvider extends BaseContentProvider<GitDiffPromptItem> {
  readonly type = 'git-diff' as const;

  constructor(context: ProviderContext) {
    super(context);
  }

  /**
   * 创建全局 Git Diff 项目
   */
  async create(): Promise<GitDiffPromptItem | undefined> {
    return this.createGitDiff();
  }

  /**
   * 创建指定文件的 Git Diff 项目
   */
  async createForFile(uri: vscode.Uri): Promise<GitDiffPromptItem | undefined> {
    return this.createGitDiff(uri);
  }

  /**
   * 创建 Git Diff 项目（全局或指定文件）
   */
  private async createGitDiff(uri?: vscode.Uri): Promise<GitDiffPromptItem | undefined> {
    // 验证是否有暂存的更改
    const hasChanges = await this.verifyHasChanges(uri);
    if (!hasChanges) {
      return undefined;
    }

    const fileName = uri ? path.basename(uri.fsPath) : undefined;
    const relativePath = uri ? this.context.getRelativePath(uri) : undefined;

    const item: GitDiffPromptItem = {
      id: uuidv4(),
      type: 'git-diff',
      title: uri ? `Git Diff: ${fileName}` : 'Git Diff (--cached)',
      content: this.createDynamicGitDiffGenerator(uri),
      filePath: relativePath,
      index: 0,
      mode: 'dynamic'
    };

    const message = uri 
      ? `已添加文件 Git Diff: ${fileName}` 
      : '已添加全局 Git Diff (--cached)';
    this.showStatusMessage(message);

    return item;
  }

  /**
   * 验证是否有暂存的更改
   */
  private async verifyHasChanges(uri?: vscode.Uri): Promise<boolean> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.showWarning('没有打开的工作区');
      return false;
    }

    try {
      const tempFile = path.join(os.tmpdir(), `git-diff-check-${Date.now()}.txt`);
      const command = uri
        ? `git -C "${workspaceRoot}" diff --cached -- "${this.context.getRelativePath(uri)}" > "${tempFile}"`
        : `git -C "${workspaceRoot}" diff --cached > "${tempFile}"`;

      await this.execCommand(command);

      const output = await fs.promises.readFile(tempFile, 'utf8');
      await fs.promises.unlink(tempFile);

      if (!output?.trim()) {
        const message = uri 
          ? `文件 ${path.basename(uri.fsPath)} 没有已暂存的更改`
          : '没有已暂存的更改';
        this.showInfo(message);
        return false;
      }

      return true;

    } catch (error) {
      this.showError(`执行 git diff 命令失败: ${this.getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * 创建动态 Git Diff 生成器
   */
  private createDynamicGitDiffGenerator(uri?: vscode.Uri): () => Promise<string> {
    return async () => {
      try {
        const git = await this.getGitAPI();
        if (!git) {
          return '错误: Git 扩展未启用';
        }

        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
          return '错误: 没有打开的工作区';
        }

        const repository = this.findRepository(git, workspaceRoot);
        if (!repository) {
          return '错误: 当前目录不是 Git 仓库';
        }

        const indexChanges = repository.state.indexChanges;
        if (!indexChanges?.length) {
          return '没有暂存的更改';
        }

        return uri 
          ? await this.getFileDiff(repository, uri, indexChanges)
          : await this.getAllDiffs(repository, indexChanges);

      } catch (error) {
        console.error('Git diff 生成失败:', error);
        return `[Error: Git diff 生成失败 - ${this.getErrorMessage(error)}]`;
      }
    };
  }

  /**
   * 获取单个文件的 diff
   */
  private async getFileDiff(
    repository: GitRepository, 
    uri: vscode.Uri,
    indexChanges: Array<{ uri: vscode.Uri; status: number }>
  ): Promise<string> {
    const relativePath = this.context.getRelativePath(uri);
    const targetChange = indexChanges.find(change => change.uri.fsPath === uri.fsPath);

    if (!targetChange) {
      return `文件 ${relativePath} 没有暂存的更改`;
    }

    try {
      const diff = await repository.diffIndexWith('HEAD', targetChange.uri.fsPath);
      return diff || '无法获取文件差异';
    } catch (error) {
      return `获取文件差异失败: ${this.getErrorMessage(error)}`;
    }
  }

  /**
   * 获取所有暂存文件的 diff
   */
  private async getAllDiffs(
    repository: GitRepository,
    indexChanges: Array<{ uri: vscode.Uri; status: number }>
  ): Promise<string> {
    let result = '暂存的更改:\n\n';

    for (const change of indexChanges) {
      const relativePath = vscode.workspace.asRelativePath(change.uri);
      const status = this.getStatusText(change.status);

      result += `${status}: ${relativePath}\n`;

      try {
        const fileDiff = await repository.diffIndexWith('HEAD', change.uri.fsPath);
        if (fileDiff) {
          result += `\n${fileDiff}\n${'='.repeat(50)}\n`;
        }
      } catch (error) {
        result += `  (无法获取详细差异: ${this.getErrorMessage(error)})\n`;
      }
    }

    return result || '没有可显示的差异内容';
  }

  /**
   * 获取 Git 状态文本
   */
  private getStatusText(status: number): string {
    const statusMap: Record<number, string> = {
      0: 'INDEX_MODIFIED',
      1: 'INDEX_ADDED',
      2: 'INDEX_DELETED',
      3: 'INDEX_RENAMED',
      4: 'INDEX_COPIED'
    };
    return statusMap[status] ?? 'UNKNOWN';
  }

  /**
   * 获取 Git API
   */
  private async getGitAPI(): Promise<GitAPI | undefined> {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    return gitExtension?.getAPI(1);
  }

  /**
   * 查找 Git 仓库
   */
  private findRepository(git: GitAPI, workspaceRoot: string): GitRepository | undefined {
    return git.repositories.find(repo => 
      workspaceRoot.startsWith(repo.rootUri.fsPath)
    );
  }

  /**
   * 获取工作区根目录
   */
  private getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * 执行命令
   */
  private execCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      require('child_process').exec(command, (error: Error | null) => {
        error ? reject(error) : resolve();
      });
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
