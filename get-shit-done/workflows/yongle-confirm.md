<purpose>
将永乐大典草稿（.draft.md）正式归档。支持直接指定文件路径，或者在未指定时自动扫描并列出所有草稿供用户选择。
</purpose>

<process>

**Step 1: 环境与参数准备**

解析 `$ARGUMENTS` 提取 `$DRAFT_PATH`。

```bash
# Windows PowerShell 兼容处理: $HOME 为空时回退到 $USERPROFILE
HOME_DIR="${HOME:-$USERPROFILE}"
ARCHIVE_DIR="${HOME_DIR}/.yongle_knowledge"
```

**Step 2: 确定目标草稿**

若 `$DRAFT_PATH` 为空：

1. **扫描所有草稿**：
   ```bash
   ls "${ARCHIVE_DIR}"/*.draft.md 2>/dev/null
   ```

2. **提示用户选择**：
   若无草稿，提示 `未找到待归档的草稿文件。` 并退出。
   若有草稿，使用 `AskUserQuestion` 展示列表。

若 `$DRAFT_PATH` 不为空，验证文件是否存在。

---

**Step 3: 审阅并确认**

读取草稿文件的 Frontmatter 信息（id, date, resolution_type, cause_summary）展示给用户。

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 永乐大典 ► 准备归档草稿
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 路径: {DRAFT_PATH}
📋  ID:   {id}
📅 日期:  {date}
💡 根因:  {cause_summary}

确认归档？
```

```
AskUserQuestion(
  header: "确认归档",
  question: "是否将此草稿正式存入知识库？",
  options: [
    { label: "✅ 确认归档", description: "重命名并更新索引" },
    { label: "❌ 取消", description: "保留草稿不操作" }
  ],
  multiSelect: false
)
```

---

**Step 4: 执行归档逻辑**

用户点击确认后：

1. **计算正式路径**：
   将文件名中的 `.draft.md` 替换为 `.md`。
   `FINAL_PATH=$(echo "$DRAFT_PATH" | sed 's/\.draft\.md$/.md/')`

2. **清洗元数据**：
   读取草稿内容，将 `draft: true` 行移除，写入正式文件路径。

3. **更新索引（INDEX.md）**：
   读取草稿中的元数据字段。
   ```bash
   INDEX_PATH="${ARCHIVE_DIR}/INDEX.md"
   
   # 如果索引不存在，先初始化表头
   if [ ! -f "$INDEX_PATH" ]; then
     echo "# 永乐大典知识索引" > "$INDEX_PATH"
     echo "" >> "$INDEX_PATH"
     echo "| 日期 | 条目ID | 分类 | 根因摘要 | 标签 |" >> "$INDEX_PATH"
     echo "|------|--------|------|----------|------|" >> "$INDEX_PATH"
   fi

   # 追加摘要行
   echo "| {date} | [{id}](./${FINAL_FILENAME}) | {resolution_type} | {cause_summary} | {tags_inline} |" >> "$INDEX_PATH"

   # 5. 更新 SQLite 索引
   # 首先确定 SCOPE
   if [[ "$DRAFT_PATH" == *".planning/knowledge"* ]]; then
     DB_SCOPE="local"
   else
     DB_SCOPE="global"
   fi
   # 准备数据 JSON
   DATA_JSON="{\"id\": \"$ID\", \"date\": \"$DATE\", \"resolution_type\": \"$TYPE\", \"cause_summary\": \"$SUMMARY\", \"tags\": [${TAGS_ARRAY}], \"filepath\": \"$FINAL_PATH\"}"
   node gsd-yongle/scripts/yongle-db.js upsert "$DB_SCOPE" "$DATA_JSON"
   ```

4. **清理旧文件**：
   删除原草稿文件。

---

**Step 5: 完成提示**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 永乐大典 ► 归档完成 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 已归档: {FINAL_PATH}
📋 索引已更新。
```

</process>
