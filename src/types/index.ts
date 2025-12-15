/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */

/**
 * Prompt 项目的类型枚举
 */
export type PromptItemType = 
  | 'file' 
  | 'snippet' 
  | 'terminal' 
  | 'tree' 
  | 'git-diff' 
  | 'user-instruction';

/**
 * 内容模式：静态内容在添加时固定，动态内容在生成时实时获取
 */
export type ContentMode = 'static' | 'dynamic';

/**
 * 动态内容生成器函数类型
 */
export type DynamicContentGenerator = () => Promise<string>;

/**
 * 内容类型：可以是静态字符串或动态生成器
 */
export type PromptContent = string | DynamicContentGenerator;

/**
 * Prompt 项目的基础属性
 */
export interface PromptItemBase {
  id: string;
  type: PromptItemType;
  title: string;
  content: PromptContent;
  mode: ContentMode;
  index: number;
}

/**
 * 文件类型项目的扩展属性
 */
export interface FilePromptItem extends PromptItemBase {
  type: 'file';
  filePath: string;
  language: string;
}

/**
 * 代码片段类型项目的扩展属性
 */
export interface SnippetPromptItem extends PromptItemBase {
  type: 'snippet';
  filePath: string;
  language: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * 终端输出类型项目
 */
export interface TerminalPromptItem extends PromptItemBase {
  type: 'terminal';
}

/**
 * 文件夹树类型项目
 */
export interface TreePromptItem extends PromptItemBase {
  type: 'tree';
  filePath: string;
}

/**
 * Git Diff 类型项目
 */
export interface GitDiffPromptItem extends PromptItemBase {
  type: 'git-diff';
  filePath?: string;
}

/**
 * 用户指令类型项目
 */
export interface UserInstructionPromptItem extends PromptItemBase {
  type: 'user-instruction';
}

/**
 * 所有 Prompt 项目类型的联合类型
 */
export type PromptItem = 
  | FilePromptItem 
  | SnippetPromptItem 
  | TerminalPromptItem 
  | TreePromptItem 
  | GitDiffPromptItem 
  | UserInstructionPromptItem;

/**
 * Prompt 生成时的排序方式
 */
export type SortOrder = 'openingOrder' | 'filePath';

/**
 * 项目变更事件类型
 */
export type ItemChangeEventType = 'add' | 'remove' | 'update' | 'reorder' | 'clear';

/**
 * 项目变更事件数据
 */
export interface ItemChangeEvent {
  type: ItemChangeEventType;
  item?: PromptItem;
  items?: PromptItem[];
}
