/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { UserInstructionPromptItem, PromptItem } from '../types';
import { BaseContentProvider, IEditableContentProvider, ProviderContext } from './IContentProvider';
import { MultilineInputDialog } from '../ui/MultilineInputDialog';

/**
 * 用户指令内容提供者
 */
export class UserInstructionProvider 
  extends BaseContentProvider<UserInstructionPromptItem>
  implements IEditableContentProvider<UserInstructionPromptItem> {
  
  readonly type = 'user-instruction' as const;

  constructor(context: ProviderContext) {
    super(context);
  }

  /**
   * 创建用户指令项目
   */
  async create(): Promise<UserInstructionPromptItem | undefined> {
    const instruction = await MultilineInputDialog.show({
      title: '添加用户指令',
      description: '请输入您的用户指令。支持多行文本，可以包含复杂的要求和说明。',
      placeholder: '例如：请帮我分析这段代码的性能问题，并给出优化建议...',
      maxLength: 5000,
      submitButtonText: '添加',
      cancelButtonText: '取消'
    });

    if (!instruction) {
      return undefined;
    }

    const trimmed = instruction.trim();
    if (!trimmed) {
      this.showWarning('用户指令不能为空');
      return undefined;
    }

    const title = this.generateTitle(trimmed);

    const item: UserInstructionPromptItem = {
      id: uuidv4(),
      type: 'user-instruction',
      title,
      content: trimmed,
      index: 0,
      mode: 'static'
    };

    this.showStatusMessage('已添加用户指令');
    return item;
  }

  /**
   * 编辑用户指令
   */
  async edit(item: UserInstructionPromptItem): Promise<UserInstructionPromptItem | undefined> {
    const currentContent = typeof item.content === 'string' 
      ? item.content 
      : await item.content();

    const newContent = await MultilineInputDialog.show({
      title: `编辑 ${item.title}`,
      description: '编辑用户指令内容',
      placeholder: '请输入新的内容...',
      initialValue: currentContent,
      maxLength: 5000,
      submitButtonText: '保存',
      cancelButtonText: '取消'
    });

    if (newContent !== undefined && newContent !== currentContent) {
      const trimmed = newContent.trim();
      return {
        ...item,
        content: trimmed,
        title: this.generateTitle(trimmed)
      };
    }

    return undefined;
  }

  /**
   * 检查用户指令是否重复
   */
  isDuplicate(item: Partial<UserInstructionPromptItem>, existingItems: PromptItem[]): boolean {
    return existingItems.some(
      existing => 
        existing.type === 'user-instruction' && 
        existing.content === item.content
    );
  }

  /**
   * 生成标题（取第一行或前50个字符）
   */
  private generateTitle(content: string): string {
    const firstLine = content.split('\n')[0].trim();
    return firstLine.length > 50 
      ? `${firstLine.substring(0, 50)}...` 
      : firstLine || '用户指令';
  }
}
