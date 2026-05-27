---
name: side-select-subset
created: 2026-05-27T17:41:16
status: OPEN
kind: directive
attach-change: null
tldr: ""
---

<!-- MUST follow frontmatter schema:
status: OPEN | DOING | DONE | CLOSED
tldr: One-sentence summary for list views — fill this! -->

# Request: side-select-subset

## Problem
<!-- What is not working or missing -->
https://github.com/frostime/vscode-files2prompt/issues/1

这个 issue 提出问题，希望能点击后只生成一部分的 Prompt

## Initial Direction
<!-- Your rough idea or preferred direction — details are fine but not required.
This becomes the starting point for the change's spec.md Approach. -->
我的想法是，给侧边栏 UI 状态增加 checkbox 选中

UI:
- For each item, 增加 checkbox
- Top 增加按钮，控制全选和取消权限


UX:
- 默认总是全选
- 新增的总是默认选中
- 点击生成按钮的时候，根据选中状态生成
- 如果为空，弹出一个简单的警告提示


---

## @AGENT
<!-- What should Agent do to implement this request -->
Adhere to the SSPEC protocol and commence development from the current Request file, following the SSPEC Change Lifecycle.
Next step: Read `sspec-clarify` SKILL + `sspec-design` SKILL + `sspec change new --from <this>`.
