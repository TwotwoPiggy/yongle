---
name: yongle:search
description: 毫秒级检索知识库条目
argument-hint: <query> [--local|--global] [--tag <tag>]
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
利用 SQLite 索引提供极速检索体验。支持关键词模糊匹配、标签过滤以及跨库（全局+本地）聚合搜索。
</objective>

<process>
Execute the yongle-search workflow from @~/.gemini/antigravity/get-shit-done/workflows/yongle-search.md end-to-end.
</process>
