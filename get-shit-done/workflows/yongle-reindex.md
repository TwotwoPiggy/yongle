<purpose>
知识库索引重构引擎。扫描目标目录下的所有知识条目，同步元数据至 SQLite 数据库。
</purpose>

<process>

**Step 1: 环境准备**

1. 解析参数 `$ARGUMENTS` 确定 `$SCOPE` (默认 `global`)。
2. 确定目标目录 `$TARGET_DIR`：
   - `local` -> `.planning/knowledge/`
   - `global` -> `~/.yongle_knowledge/` (处理 Windows 路径)
3. 初始化数据库：
   ```bash
   node gsd-yongle/scripts/yongle-db.js init "$SCOPE"
   ```

---

**Step 2: 扫描与提取**

1. 递归扫描 `$TARGET_DIR` 下的所有 `.md` 文件（排除 `INDEX.md` 和 `WATCHING.md`）。
2. 对于每个文件：
   - 读取文件内容。
   - 提取 YAML Frontmatter 中的 `id`, `date`, `resolution_type`, `cause_summary`, `tags`。
   - 构造 JSON 数据对象。
   - 执行写入：
     ```bash
     node gsd-yongle/scripts/yongle-db.js upsert "$SCOPE" '{"id": "...", "date": "...", ...}'
     ```

---

**Step 3: 结果统计**

1. 完成后显示统计信息：
   - 扫描文件总数。
   - 成功更新的条目数。
   - 数据库路径。

</process>

<notes>
- 索引过程会覆盖已有记录（UPSERT），保证 DB 与 FS 同步。
- 如果文件不包含有效的 Frontmatter，则跳过。
</notes>
