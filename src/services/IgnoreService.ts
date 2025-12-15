/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 忽略规则配置
 */
export interface IgnoreConfig {
  /** 忽略的目录名（精确匹配） */
  directories: string[];
  /** 忽略的文件名（精确匹配） */
  files: string[];
  /** 忽略的扩展名（如 .pyc） */
  extensions: string[];
  /** 忽略的 glob 模式 */
  patterns: string[];
}

/**
 * 默认忽略规则
 */
const DEFAULT_IGNORE: IgnoreConfig = {
  directories: [
    '.git',
    '.svn',
    '.hg',
    'node_modules',
    '__pycache__',
    '.venv',
    'venv',
    '.env',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    '.cache',
    '.parcel-cache',
    '.turbo',
    'out',
    'target'
  ],
  files: [
    '.DS_Store',
    'Thumbs.db',
    '.gitignore',
    '.gitattributes',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'composer.lock',
    'Cargo.lock',
    'Gemfile.lock',
    'poetry.lock'
  ],
  extensions: [
    '.pyc',
    '.pyo',
    '.pyd',
    '.so',
    '.dll',
    '.dylib',
    '.class',
    '.o',
    '.obj',
    '.exe',
    '.bin',
    '.map',
    '.min.js',
    '.min.css'
  ],
  patterns: []
};

/**
 * 忽略规则服务
 * 
 * 职责：判断文件/目录是否应该被忽略
 */
export class IgnoreService {
  private config: IgnoreConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 从 VS Code 配置加载忽略规则
   */
  private loadConfig(): IgnoreConfig {
    const vsConfig = vscode.workspace.getConfiguration('assembleCodeToPrompt');

    return {
      directories: vsConfig.get<string[]>('ignore.directories') ?? DEFAULT_IGNORE.directories,
      files: vsConfig.get<string[]>('ignore.files') ?? DEFAULT_IGNORE.files,
      extensions: vsConfig.get<string[]>('ignore.extensions') ?? DEFAULT_IGNORE.extensions,
      patterns: vsConfig.get<string[]>('ignore.patterns') ?? DEFAULT_IGNORE.patterns
    };
  }

  /**
   * 重新加载配置
   */
  reload(): void {
    this.config = this.loadConfig();
  }

  /**
   * 判断目录是否应该被忽略
   */
  shouldIgnoreDirectory(dirName: string): boolean {
    // 精确匹配目录名
    if (this.config.directories.includes(dirName)) {
      return true;
    }

    // 检查 glob 模式
    return this.matchesPatterns(dirName, true);
  }

  /**
   * 判断文件是否应该被忽略
   */
  shouldIgnoreFile(fileName: string): boolean {
    // 精确匹配文件名
    if (this.config.files.includes(fileName)) {
      return true;
    }

    // 检查扩展名
    const ext = path.extname(fileName).toLowerCase();
    if (ext && this.config.extensions.includes(ext)) {
      return true;
    }

    // 检查是否以 . 开头（隐藏文件）
    // 注意：这里不默认忽略所有隐藏文件，只忽略配置中的

    // 检查 glob 模式
    return this.matchesPatterns(fileName, false);
  }

  /**
   * 判断路径是否匹配任何 glob 模式
   */
  private matchesPatterns(name: string, isDirectory: boolean): boolean {
    for (const pattern of this.config.patterns) {
      if (this.matchGlobPattern(name, pattern, isDirectory)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 简单的 glob 模式匹配
   * 支持: *, ?, **
   */
  private matchGlobPattern(name: string, pattern: string, isDirectory: boolean): boolean {
    // 处理目录专用模式（以 / 结尾）
    if (pattern.endsWith('/')) {
      if (!isDirectory) return false;
      pattern = pattern.slice(0, -1);
    }

    // 转换 glob 为正则表达式
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // 转义特殊字符
      .replace(/\*\*/g, '<<<GLOBSTAR>>>')     // 临时替换 **
      .replace(/\*/g, '[^/]*')                // * 匹配非 / 字符
      .replace(/\?/g, '[^/]')                 // ? 匹配单个非 / 字符
      .replace(/<<<GLOBSTAR>>>/g, '.*');      // ** 匹配任意字符

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(name);
  }

  /**
   * 获取当前配置（用于调试）
   */
  getConfig(): Readonly<IgnoreConfig> {
    return { ...this.config };
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig(): Readonly<IgnoreConfig> {
    return { ...DEFAULT_IGNORE };
  }
}
