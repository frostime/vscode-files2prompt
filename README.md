# files-to-prompt 使用说明

一个将VS Code中打开的文件合并为Prompt格式的扩展工具，方便将代码内容复制到GPT等AI工具中。

## 功能特性
- 合并所有打开的文本文件内容
- 生成格式化的 prompt 文本，并显示在一个新的文档中

## 使用方法
1. 在VS Code中打开需要合并的文件
2. 通过以下方式触发合并：
   - 命令面板(Ctrl+Shift+P)搜索"将打开的文件的内容合并为Prompt"
   - 或在编辑器右键菜单中选择该功能

## 示例输出
合并两个文件后的输出格式：

```plaintext
<file path="src/main.js">
console.log("Hello World");
</file>

<file path="utils/helper.js">
function helper() {
  return "help";
}
</file>
```