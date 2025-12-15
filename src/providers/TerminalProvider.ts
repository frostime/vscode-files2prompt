/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { TerminalPromptItem } from '../types';
import { BaseContentProvider, IEditableContentProvider, ProviderContext } from './IContentProvider';
import { MultilineInputDialog } from '../ui/MultilineInputDialog';

/**
 * 终端输出内容提供者
 */
export class TerminalProvider 
  extends BaseContentProvider<TerminalPromptItem> 
  implements IEditableContentProvider<TerminalPromptItem> {
  
  readonly type = 'terminal' as const;

  constructor(context: ProviderContext) {
    super(context);
  }

  /**
   * 从当前活动终端捕获输出
   */
  async create(): Promise<TerminalPromptItem | undefined> {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
      this.showWarning('没有活动的终端');
      return undefined;
    }

    const terminalName = terminal.name;
    const output = await this.captureTerminalOutput();

    if (!output) {
      return undefined;
    }

    const item: TerminalPromptItem = {
      id: uuidv4(),
      type: 'terminal',
      title: `Terminal: ${terminalName}`,
      content: output,
      index: 0,
      mode: 'static'
    };

    this.showStatusMessage(`已添加终端输出: ${terminalName}`);
    return item;
  }

  /**
   * 编辑终端输出内容
   */
  async edit(item: TerminalPromptItem): Promise<TerminalPromptItem | undefined> {
    const currentContent = typeof item.content === 'string' 
      ? item.content 
      : await item.content();

    const newContent = await MultilineInputDialog.show({
      title: `编辑 ${item.title}`,
      description: '编辑终端输出内容',
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
   * 捕获终端输出
   */
  private async captureTerminalOutput(): Promise<string | undefined> {
    try {
      // 尝试执行 VS Code 的复制命令
      await vscode.commands.executeCommand(
        'workbench.action.terminal.copyLastCommandAndLastCommandOutput'
      );

      // 等待复制操作完成
      await this.delay(300);

      const output = await vscode.env.clipboard.readText();

      if (!output?.trim()) {
        return this.promptManualInput();
      }

      return output;

    } catch {
      return this.promptManualInput();
    }
  }

  /**
   * 提示用户手动输入终端输出
   */
  private async promptManualInput(): Promise<string | undefined> {
    const output = await vscode.window.showInputBox({
      prompt: '无法自动获取终端输出，请手动复制并粘贴到此处',
      placeHolder: '终端输出内容'
    });

    return output?.trim() || undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
