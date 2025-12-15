/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { PromptItem, PromptItemType } from '../types';

/**
 * 内容提供者接口
 * 
 * 遵循开闭原则（OCP）：通过实现此接口扩展新的内容类型，无需修改现有代码
 * 遵循依赖倒置原则（DIP）：高层模块依赖此抽象接口
 */
export interface IContentProvider<T extends PromptItem = PromptItem> {
  /**
   * 提供者处理的内容类型
   */
  readonly type: PromptItemType;

  /**
   * 创建新的 Prompt 项目
   */
  create(...args: any[]): Promise<T | undefined>;

  /**
   * 检查是否为重复项目
   */
  isDuplicate?(item: Partial<T>, existingItems: PromptItem[]): boolean;
}

/**
 * 支持编辑的内容提供者
 */
export interface IEditableContentProvider<T extends PromptItem = PromptItem> extends IContentProvider<T> {
  /**
   * 编辑现有项目
   */
  edit(item: T): Promise<T | undefined>;
}

/**
 * 提供者上下文：提供者可能需要的共享依赖
 */
export interface ProviderContext {
  /**
   * 获取相对路径
   */
  getRelativePath(uri: vscode.Uri): string;
}

/**
 * 内容提供者基类
 * 
 * 提供通用功能实现，遵循 DRY 原则
 */
export abstract class BaseContentProvider<T extends PromptItem = PromptItem> implements IContentProvider<T> {
  abstract readonly type: PromptItemType;

  constructor(protected readonly context: ProviderContext) {}

  abstract create(...args: any[]): Promise<T | undefined>;

  /**
   * 显示状态栏消息
   */
  protected showStatusMessage(message: string, timeout: number = 3000): void {
    vscode.window.setStatusBarMessage(message, timeout);
  }

  /**
   * 显示错误消息
   */
  protected showError(message: string): void {
    vscode.window.showErrorMessage(message);
  }

  /**
   * 显示警告消息
   */
  protected showWarning(message: string): void {
    vscode.window.showWarningMessage(message);
  }

  /**
   * 显示信息消息
   */
  protected showInfo(message: string): void {
    vscode.window.showInformationMessage(message);
  }
}
