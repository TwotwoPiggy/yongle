<purpose>
基于 SQLite 的高性能检索引擎。支持聚合查询与结果美化展示。
</purpose>

<process>

**Step 1: 参数解析**

1. 提取 `$QUERY` (位置参数)。
2. 识别过滤器：
   - `--local`: 只查询当前项目索引。
   - `--global`: 只查询全局仓库索引。
   - `--tag <tag>`: 按标签精准/模糊过滤。

---

**Step 2: 构建查询**

1. 定义基础 SQL：
   ```sql
   SELECT id, date, resolution_type, cause_summary, tags, filepath, source 
   FROM entries 
   WHERE (cause_summary LIKE '%$QUERY%' OR id LIKE '%$QUERY%')
   ```
2. 如果有 `--tag`：
   ```sql
   AND tags LIKE '%$TAG%'
   ```
3. 执行查询：
   - 如果未指定范围，分别对 `local` 和 `global` 执行查询并合并结果。
   - 命令：`node gsd-yongle/scripts/yongle-db.js query <scope> "<SQL>"`

---

**Step 3: 结果展示**

1. 显示检索横幅：
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    永乐大典 ► 检索结果 (关键词: "$QUERY")
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
2. 以 Markdown 表格形式展示命中条目：
   - 字段：来源 (Source), 日期 (Date), ID, 摘要 (Summary)。
3. 提供快速打开建议：
   - “提示：你可以直接点击以上链接或复制路径到编辑器预览。”

</process>

<notes>
- 检索过程不涉及文件 IO（除了 DB 访问），极具性能优势。
- `source` 字段在聚合搜索时作为第一列展示，区分 `[Local]` 与 `[Global]`。
</notes>
