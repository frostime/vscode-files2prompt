# Assemble Code to Prompt

将代码、终端输出、目录结构组装成 Prompt，发送给 LLM。

![效果](preview.png)

## 快速开始

### 添加内容

| 操作 | 方式 |
|------|------|
| 添加文件 | 资源管理器右键 → 添加文件到 Prompt |
| 添加文件夹 | 资源管理器右键 → 添加文件到 Prompt（自动递归） |
| 添加选中代码 | 编辑器选中代码 → 右键 → 添加选中代码 |
| 添加目录树 | 资源管理器右键文件夹 → 添加文件夹树结构 |
| 添加终端输出 | 终端右键 → 添加终端输出 |
| 添加 Git Diff | 命令面板 → `Prompt: 添加全局 Git Diff` |
| 添加用户指令 | 面板顶部 ➕ → 添加用户指令 |

### 管理与生成

- **查看**：左侧活动栏 → Prompt 集合面板
- **排序**：拖拽项目 或 点击 ↑↓ 按钮
- **编辑**：静态内容项目显示 ✏️ 按钮
- **删除**：点击 🗑️ 按钮
- **生成 Prompt**：点击 ▶️ 按钮
- **导出 ZIP**：点击 📦 按钮

## 支持的内容类型

| 类型 | 模式 | 说明 |
|------|------|------|
| 文件 | 动态 | 生成时读取最新内容 |
| 代码片段 | 静态 | 添加时固定内容 |
| 终端输出 | 静态 | 可编辑 |
| 目录树 | 动态 | 生成时刷新结构 |
| Git Diff | 动态 | 生成时获取最新 diff |
| 用户指令 | 静态 | 可编辑，始终置顶 |

## 配置

打开设置，搜索 `assembleCodeToPrompt`。

### 忽略规则

添加文件夹时自动跳过：

```jsonc
// 忽略目录（默认包含 .git, node_modules, __pycache__ 等）
"assembleCodeToPrompt.ignore.directories": [".git", "node_modules", "dist"]

// 忽略文件
"assembleCodeToPrompt.ignore.files": [".DS_Store", "package-lock.json"]

// 忽略扩展名
"assembleCodeToPrompt.ignore.extensions": [".pyc", ".exe", ".min.js"]

// glob 模式
"assembleCodeToPrompt.ignore.patterns": ["*.log", "temp_*"]
```

### 格式化方案

```jsonc
// 预设: xml | markdown | plain | github | custom
"assembleCodeToPrompt.format.preset": "xml"
```

| 预设 | 输出 |
|------|------|
| `xml` | `<Content src="path" lang="ts">code</Content>` |
| `markdown` | ` ```ts\ncode\n``` ` |
| `plain` | 纯代码，无包装 |
| `github` | `<!-- filepath: path -->\n```ts\ncode\n``` ` |
| `custom` | 自定义函数 |

**自定义格式化**：

```jsonc
"assembleCodeToPrompt.format.preset": "custom",
"assembleCodeToPrompt.format.customScript": "function format(ctx) { return `// ${ctx.filePath}\\n${ctx.content}`; }"
```

`ctx` 参数：

```typescript
{
  filePath: string;    // 相对路径
  language: string;    // 语言标识
  content: string;     // 文件内容
  type: 'file' | 'snippet';
  lineStart?: number;  // 仅 snippet
  lineEnd?: number;    // 仅 snippet
}
```

## 生成顺序

1. 用户指令
2. 终端输出
3. 目录树
4. Git Diff
5. 代码文件/片段

## 命令列表

| 命令 | 说明 |
|------|------|
| `Prompt: 添加文件到 Prompt` | 添加当前文件 |
| `Prompt: 添加所有打开的文件` | 批量添加 |
| `Prompt: 添加选中代码` | 添加选区 |
| `Prompt: 添加终端输出` | 捕获终端 |
| `Prompt: 添加文件夹树结构` | 生成目录树 |
| `Prompt: 添加全局 Git Diff` | 暂存区 diff |
| `Prompt: 添加文件 Git Diff` | 单文件 diff |
| `Prompt: 添加用户指令` | 添加提示文本 |
| `Prompt: 生成 Prompt` | 生成并打开 |
| `Prompt: 导出为 ZIP` | 打包文件 |
| `Prompt: 清空 Prompt 集合` | 清空所有 |
| `Prompt: 重新加载配置` | 刷新配置 |

## 链接

- [GitHub](https://github.com/frostime/vscode-files2prompt)
- 作者：frostime
