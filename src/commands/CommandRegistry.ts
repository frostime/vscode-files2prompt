/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import { PromptItem, SnippetPromptItem, TerminalPromptItem, UserInstructionPromptItem } from '../types';
import { PromptItemStore } from '../core/PromptItemStore';
import { PromptGenerator } from '../services/PromptGenerator';
import { PathService } from '../services/PathService';
import {
  FileProvider,
  SnippetProvider,
  TerminalProvider,
  FolderTreeProvider,
  GitDiffProvider,
  UserInstructionProvider,
  IEditableContentProvider
} from '../providers';
import { PromptItemNode } from '../ui/PromptTreeDataProvider';
import { MultilineInputDialog } from '../ui/MultilineInputDialog';

/**
 * 命令注册器
 * 
 * 职责：注册和处理所有 VS Code 命令
 * 遵循单一职责原则：只负责命令注册和路由，具体逻辑委托给各个服务
 */
export class CommandRegistry {
  private readonly pathService: PathService;
  private readonly promptGenerator: PromptGenerator;

  // 内容提供者
  private readonly fileProvider: FileProvider;
  private readonly snippetProvider: SnippetProvider;
  private readonly terminalProvider: TerminalProvider;
  private readonly folderTreeProvider: FolderTreeProvider;
  private readonly gitDiffProvider: GitDiffProvider;
  private readonly userInstructionProvider: UserInstructionProvider;

  constructor(
    private readonly store: PromptItemStore
  ) {
    this.pathService = new PathService();
    this.promptGenerator = new PromptGenerator();

    // 初始化提供者
    this.fileProvider = new FileProvider(this.pathService);
    this.snippetProvider = new SnippetProvider(this.pathService);
    this.terminalProvider = new TerminalProvider(this.pathService);
    this.folderTreeProvider = new FolderTreeProvider(this.pathService);
    this.gitDiffProvider = new GitDiffProvider(this.pathService);
    this.userInstructionProvider = new UserInstructionProvider(this.pathService);
  }

  /**
   * 注册所有命令
   */
  register(context: vscode.ExtensionContext): void {
    const commands: Array<[string, (...args: any[]) => any]> = [
      ['addFileToPrompt', this.addFile.bind(this)],
      ['addOpenedFilesToPrompt', this.addOpenedFiles.bind(this)],
      ['addSelectionToPrompt', this.addSelection.bind(this)],
      ['addTerminalOutputToPrompt', this.addTerminalOutput.bind(this)],
      ['addFolderTreeToPrompt', this.addFolderTree.bind(this)],
      ['addGitDiffCachedToPrompt', this.addGitDiffCached.bind(this)],
      ['addGitDiffFileToPrompt', this.addGitDiffFile.bind(this)],
      ['addUserInstructionToPrompt', this.addUserInstruction.bind(this)],
      ['removeItemFromPrompt', this.removeItem.bind(this)],
      ['moveItemUp', this.moveItemUp.bind(this)],
      ['moveItemDown', this.moveItemDown.bind(this)],
      ['clearPromptItems', this.clearItems.bind(this)],
      ['generatePrompt', this.generatePrompt.bind(this)],
      ['editStaticPromptItem', this.editStaticItem.bind(this)]
    ];

    for (const [name, handler] of commands) {
      const disposable = vscode.commands.registerCommand(
        `assemble-code-to-prompt.${name}`,
        handler
      );
      context.subscriptions.push(disposable);
    }
  }

  /**
   * 添加文件到 Prompt 集合
   */
  private async addFile(
    contextSelection?: vscode.Uri,
    allSelections?: vscode.Uri[]
  ): Promise<void> {
    const uris = await this.resolveFileUris(contextSelection, allSelections);

    for (const uri of uris) {
      await this.addFileOrDirectory(uri);
    }

    this.showPromptPanel();
  }

  /**
   * 添加文件或目录
   */
  private async addFileOrDirectory(uri: vscode.Uri): Promise<void> {
    try {
      const stats = await fs.promises.stat(uri.fsPath);

      if (stats.isDirectory()) {
        const items = await this.fileProvider.createFromDirectory(uri);
        for (const item of items) {
          if (!this.fileProvider.isDuplicate(item, this.store.getAll())) {
            this.store.add(item);
          }
        }
      } else {
        const item = await this.fileProvider.create(uri);
        if (item && !this.fileProvider.isDuplicate(item, this.store.getAll())) {
          this.store.add(item);
        }
      }
    } catch (error) {
      console.error('添加文件失败:', error);
    }
  }

  /**
   * 解析文件 URI 列表
   */
  private async resolveFileUris(
    contextSelection?: vscode.Uri,
    allSelections?: vscode.Uri[]
  ): Promise<vscode.Uri[]> {
    // 多选
    if (allSelections?.length) {
      return allSelections;
    }

    // 单选
    if (contextSelection) {
      return [contextSelection];
    }

    // 当前活动编辑器
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.scheme === 'file') {
      return [activeEditor.document.uri];
    }

    // 文件选择对话框
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: '添加到 Prompt'
    });

    return uris || [];
  }

  /**
   * 添加所有打开的文件
   */
  private async addOpenedFiles(): Promise<void> {
    const openDocuments = vscode.workspace.textDocuments.filter(
      doc => doc.uri.scheme === 'file'
    );

    if (openDocuments.length === 0) {
      vscode.window.showInformationMessage('没有打开的文件可以合并');
      return;
    }

    for (const document of openDocuments) {
      const item = await this.fileProvider.create(document.uri);
      if (item && !this.fileProvider.isDuplicate(item, this.store.getAll())) {
        this.store.add(item);
      }
    }

    this.showPromptPanel();
  }

  /**
   * 添加选中内容
   */
  private async addSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.selection.isEmpty) {
      vscode.window.showWarningMessage('请先选择代码片段');
      return;
    }

    const item = await this.snippetProvider.create(
      editor.document,
      editor.selection
    );

    if (item && !this.snippetProvider.isDuplicate(item, this.store.getAll())) {
      this.store.add(item);
    }

    this.showPromptPanel();
  }

  /**
   * 添加终端输出
   */
  private async addTerminalOutput(): Promise<void> {
    const item = await this.terminalProvider.create();
    if (item) {
      this.store.add(item);
    }
    this.showPromptPanel();
  }

  /**
   * 添加文件夹树结构
   */
  private async addFolderTree(uri?: vscode.Uri): Promise<void> {
    const targetUri = uri || await this.selectFolder();
    if (!targetUri) return;

    const item = await this.folderTreeProvider.create(targetUri);
    if (item) {
      this.store.add(item);
    }
    this.showPromptPanel();
  }

  /**
   * 添加全局 Git Diff
   */
  private async addGitDiffCached(): Promise<void> {
    const item = await this.gitDiffProvider.create();
    if (item) {
      this.store.add(item);
    }
    this.showPromptPanel();
  }

  /**
   * 添加文件 Git Diff
   */
  private async addGitDiffFile(uri?: vscode.Uri): Promise<void> {
    const targetUri = uri || await this.resolveActiveFileUri();
    if (!targetUri) return;

    const item = await this.gitDiffProvider.createForFile(targetUri);
    if (item) {
      this.store.add(item);
    }
    this.showPromptPanel();
  }

  /**
   * 添加用户指令
   */
  private async addUserInstruction(): Promise<void> {
    const item = await this.userInstructionProvider.create();
    if (item && !this.userInstructionProvider.isDuplicate(item, this.store.getAll())) {
      this.store.add(item);
    }
    this.showPromptPanel();
  }

  /**
   * 删除项目
   */
  private removeItem(node: PromptItemNode): void {
    if (node) {
      const removed = this.store.remove(node.id);
      if (removed) {
        vscode.window.setStatusBarMessage(`已删除: ${removed.title}`, 3000);
      }
    }
  }

  /**
   * 上移项目
   */
  private moveItemUp(node: PromptItemNode): void {
    if (!node) return;

    const items = this.store.getAll();
    const index = items.findIndex(item => item.id === node.id);

    if (index > 0) {
      this.store.reorder(index, index - 1);
    }
  }

  /**
   * 下移项目
   */
  private moveItemDown(node: PromptItemNode): void {
    if (!node) return;

    const items = this.store.getAll();
    const index = items.findIndex(item => item.id === node.id);

    if (index < items.length - 1) {
      this.store.reorder(index, index + 1);
    }
  }

  /**
   * 清空所有项目
   */
  private clearItems(): void {
    this.store.clear();
    vscode.window.setStatusBarMessage('已清空 Prompt 集合', 3000);
  }

  /**
   * 生成 Prompt
   */
  private async generatePrompt(): Promise<void> {
    const items = this.store.getAll();
    const prompt = await this.promptGenerator.generate(items, 'openingOrder');

    const document = await vscode.workspace.openTextDocument({
      content: prompt,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(document, { preview: false });
  }

  /**
   * 编辑静态项目
   */
  private async editStaticItem(node: PromptItemNode): Promise<void> {
    if (!node?.item) {
      vscode.window.showErrorMessage('无法获取项目信息');
      return;
    }

    const item = node.item;

    if (item.mode !== 'static') {
      vscode.window.showErrorMessage('只能编辑静态模式的项目');
      return;
    }

    // 根据类型选择对应的编辑器
    let updatedItem: PromptItem | undefined;

    switch (item.type) {
      case 'terminal':
        updatedItem = await this.terminalProvider.edit(item as TerminalPromptItem);
        break;
      case 'user-instruction':
        updatedItem = await this.userInstructionProvider.edit(item as UserInstructionPromptItem);
        break;
      case 'snippet':
        updatedItem = await this.editSnippet(item as SnippetPromptItem);
        break;
      default:
        vscode.window.showErrorMessage('此类型的项目不支持编辑');
        return;
    }

    if (updatedItem) {
      this.store.update(item.id, updatedItem);
      vscode.window.showInformationMessage('项目内容已更新');
    }
  }

  /**
   * 编辑代码片段
   */
  private async editSnippet(item: SnippetPromptItem): Promise<SnippetPromptItem | undefined> {
    const currentContent = typeof item.content === 'string'
      ? item.content
      : await item.content();

    const newContent = await MultilineInputDialog.show({
      title: `编辑代码片段`,
      description: `编辑 ${item.filePath} (lines ${item.lineStart}-${item.lineEnd})`,
      placeholder: '请输入新的内容...',
      initialValue: currentContent,
      maxLength: 50000,
      submitButtonText: '保存',
      cancelButtonText: '取消'
    });

    if (newContent !== undefined && newContent !== currentContent) {
      return { ...item, content: newContent };
    }

    return undefined;
  }

  /**
   * 选择文件夹
   */
  private async selectFolder(): Promise<vscode.Uri | undefined> {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: '添加文件夹树结构'
    });

    return uris?.[0];
  }

  /**
   * 获取当前活动文件 URI
   */
  private async resolveActiveFileUri(): Promise<vscode.Uri | undefined> {
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor?.document.uri.scheme === 'file') {
      return activeEditor.document.uri;
    }

    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: '添加文件 Git Diff'
    });

    return uris?.[0];
  }

  /**
   * 显示 Prompt 面板
   */
  private showPromptPanel(): void {
    vscode.commands.executeCommand('workbench.view.extension.prompt-explorer');
  }
}
