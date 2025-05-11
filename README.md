# Code to Prompt

VS Code 扩展，用于将代码、终端输出和文件夹结构快速合并为格式化的 Prompt，方便复制到 GPT 等 AI 工具中。

## 主要功能

- **一键合并模式**：将所有打开的文件一次性合并为 Prompt
- **增量构建模式**：逐步添加内容到集合，然后生成 Prompt
- **支持多种内容类型**：
  - 代码文件
  - 代码片段
  - 终端输出
  - 文件夹树结构
- **支持目录**：可以添加整个目录下的所有文件

## 使用方法

### 一键合并模式

1. 在 VS Code 中打开需要合并的文件
2. Ctrl+Shift+P 打开命令面板，输入并选择 "将打开的文件的内容合并为 Prompt"

### 增量构建模式

1. 通过以下方式添加内容到 Prompt 集合：
   - **添加代码文件**：在文件资源管理器中右键文件/目录，选择 "添加文件到 Prompt 集合"
   - **添加代码片段**：选中代码后右键，选择 "添加选中内容到 Prompt 集合"
   - **添加终端输出**：在终端窗口中右键，选择 "添加终端输出到 Prompt 集合"（会自动获取终端历史记录）
   - **添加文件夹树结构**：在文件资源管理器中右键文件夹，选择 "添加文件夹树结构到 Prompt 集合"
2. 在左侧活动栏的 "Prompt 集合" 面板中查看已添加的项目
3. 点击面板顶部的 "生成 Prompt" 按钮生成最终 Prompt

## Prompt 格式

生成的 Prompt 将按以下顺序组织内容：

1. **终端输出**（如果有）
2. **文件夹树结构**（如果有）
3. **代码文件和代码片段**

## 示例输出

> ### Terminal Output ###
>
> Terminal: PowerShell
> ```
> PS> node -v
> v20.11.1
> ```
>
> ### Folder Structure ###
>
> Tree: src
> ```
> src/
> ├── extension.ts
> ├── promptManager.ts
> ├── promptTreeProvider.ts
> ├── commandHandler.ts
> └── statusBarController.ts
> ```
>
> ### Code ###
>
> Outlines:
>
> - package.json (snippet)
> - tsconfig.json
>
> Content:
>
> 文件: package.json (lines 1-20)
> ```json
>   "name": "assemble-code-to-prompt",
>   "displayName": "Code to Prompt",
>   "author": {
>     "name": "frostime"
>   },
>   "description": "快速将代码、终端输出和文件夹结构合并成一个 Prompt，方便你复制给 GPT",
>   "repository": {
>     "type": "git",
>     "url": "https://github.com/frostime/vscode-files2prompt"
>   },
>   "version": "1.1.1",
>   "engines": {
>     "vscode": "^1.95.0"
>   },
>   "categories": [
>     "Other"
>   ],
> ```
>
> 文件: tsconfig.json
> ```json
> {
>   "compilerOptions": {
>     "module": "Node16",
>     "target": "ES2022",
>     "outDir": "out",
>     "lib": [
>       "ES2022"
>     ],
>     "sourceMap": true,
>     "rootDir": "src",
>     "strict": true
>   }
> }
> ```

## 快捷操作

- 在 Prompt 集合面板中可以上移/下移项目调整顺序
- 右键点击项目可以从集合中删除
- 点击面板顶部的清空按钮可以清空整个集合

## 关于

- 作者：frostime
- 仓库：[GitHub](https://github.com/frostime/vscode-files2prompt)
- 问题反馈：请在 GitHub 仓库提交 Issue