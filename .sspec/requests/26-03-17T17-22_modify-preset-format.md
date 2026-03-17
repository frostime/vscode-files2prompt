---
name: modify-preset-format
created: 2026-03-17 17:22:08
status: DOING
attach-change: .sspec/changes/26-03-17T17-31_modify-preset-format/spec.md
tldr: ''
---
<!-- @RULE: Frontmatter Type
status: OPEN | DOING | DONE | CLOSED;
tldr: One-sentence summary for list views — fill this!
 -->

# Request: modify-preset-format

## Direction
我打算更改预设的 prompt format preset

保留如下几个预设:
- xml
- markdown
- custom

其中 plain 和 github 都被默认合并到 markdown 风格中

同时更改默认 markdown 的行为，采用合并 github + md 的风格，类似这样

`````template
<!-- filepath: {PATH} -->
````{ext}
<Content>
````
`````

也就说是：

1. 增加 header 注释
2. 把默认的 ``` 改成 ````  这样可以有效解决 ``` 嵌套问题


## Success Criteria

- 实现我上述的要求
- 对用户而言升级之后，可以自动 fallback

## Relational Context
<!-- Constraints, preferences, related filelinks -->

package.json
src\services\FormatterService.ts
src\services\PromptGenerator.ts

以及插件设置相关（需要自动迁移设置）

---

## @AGENT
<!-- What should Agent do to implement this request -->
Adhere to the SSPEC protocol specifications and commence development from the current Request file, following the SSPEC/Development Lifecycle.
Next step: Read `sspec-research` SKILL + `sspec-design` SKILLs + `sspec change new --from <this>`.
