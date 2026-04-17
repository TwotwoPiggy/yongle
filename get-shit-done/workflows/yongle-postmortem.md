<purpose>
永乐大典（Yongle Dadian）复盘引擎。在 AI 辅助开发过程中，当一个 Bug 被解决或某项任务最终跑通后，提取这段对话中的核心错误信息、调试过程与解决方案，将其凝练为结构化的知识条目并进行两段式落盘（草稿 → 确认归档）。
</purpose>

<knowledge_schema>
每份知识条目必须包含以下6个 YAML Frontmatter 字段（缺少任何一个均视为无效条目）：

```yaml
---
id: "<YYYYMMDD>-<kebab-case-summary>"          # 唯一ID，如: 20260418-dotnet-ef-migration-fail
date: "<YYYY-MM-DD>"                            # 记录日期
resolution_type: "<类型>"                       # 分类: bug-fix | config-fix | api-change | env-issue | logic-error | other
tags:                                           # 技术栈与领域标签
  - "<tag1>"
  - "<tag2>"
host_agent: "<Agent名称>"                       # 执行解决方案的AI Agent: antigravity | codex | cursor | other
cause_summary: "<一句话精炼根因>"               # 30字以内，直接说明问题本质
---
```
</knowledge_schema>

<process>

**Step 1: 解析启动参数**

解析 `$ARGUMENTS`：
- `--global` → 归档目标为 `~/.yongle_knowledge/`（默认）
- `--local` → 归档目标为当前项目的 `.planning/knowledge/`
- `--model <name>` → 覆盖分析时使用的模型名称（仅作记录，实际由宿主Agent调度）

若未指定 scope，默认使用 `--global`。

确定归档路径（存储为 `$ARCHIVE_DIR`）：
```bash
if [ "$SCOPE" = "local" ]; then
  ARCHIVE_DIR=".planning/knowledge"
else
  ARCHIVE_DIR="$HOME/.yongle_knowledge"
fi
mkdir -p "$ARCHIVE_DIR"
```

---

**Step 2: 上下文智能回溯与分析**

显示分析提示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 永乐大典 ► 正在扫描对话上下文...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

向上回溯当前对话的历史记录，执行以下智能识别：

**2a. 识别问题边界**
- 定位对话中出现的**第一个报错信号**（如：错误堆栈、Build Failed、Exception、构建中断等关键词）
- 定位**最终解决方案**（如：用户确认"成功了"、"跑通了"、"好的"等，或最后一次成功的代码运行结果）
- 如果问题经历了**多次尝试**（失败→重试→成功），将这几次相关的上下文**整体打包**作为分析基础，不裁剪中间的失败尝试（它们是最宝贵的"踩坑记录"）

**2b. 提炼核心内容**：
- **根本原因**（Root Cause）：一句话说清为何会出错
- **调试历程**（Debug Path）：简述尝试了哪些方向，哪些失败了、哪些成功了
- **最终解决方案**（Resolution）：最终起作用的具体操作步骤
- **防复发建议**（Prevention）：下次如何避免类似问题

**2c. 填充元数据**：
- 根据内容推断 `resolution_type`
- 根据涉及的技术栈提取 `tags`（如: dotnet, ef-core, build, migrations, docker）
- `host_agent` 设置为当前宿主环境（如 `antigravity`）
- `date` 设置为今日日期
- `id` 格式为 `YYYYMMDD-<kebab-cause-summary>`（最多5个单词）

---

**Step 3: 确认分析结果**

在正式落盘前，向用户展示提炼摘要：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 永乐大典 ► 分析完成，准备归档
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋  ID:          {id}
📅  日期:        {date}
🏷️  分类:        {resolution_type}
🔖  标签:        {tags}
🤖  记录Agent:   {host_agent}
💡  根因摘要:    {cause_summary}

确认写入草稿？
```

```
AskUserQuestion(
  header: "永乐大典 — 归档确认",
  question: "以上分析准确吗？",
  options: [
    { label: "✅ 确认，写入草稿", description: "将按以上内容生成草稿文件" },
    { label: "✏️ 修改根因摘要", description: "对 cause_summary 进行手动修正后再归档" },
    { label: "🏷️ 修改标签/分类", description: "对 tags 或 resolution_type 进行调整" },
    { label: "❌ 取消", description: "不归档此次记录" }
  ],
  multiSelect: false
)
```

- 如果用户选择"修改根因摘要"或"修改标签/分类"，用文本跟进问题收集修改内容，更新相应字段后重新展示确认。
- 如果用户选择"取消"，打印 `已取消归档。` 并退出。

---

**Step 4: 写入草稿文件**

生成日期时间戳前缀：
```bash
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DRAFT_FILENAME="${TIMESTAMP}-${SLUG}.draft.md"
DRAFT_PATH="${ARCHIVE_DIR}/${DRAFT_FILENAME}"
```

将完整知识条目写入草稿文件，格式如下：

```markdown
---
id: "{id}"
date: "{date}"
resolution_type: "{resolution_type}"
tags:
{tags_yaml_list}
host_agent: "{host_agent}"
cause_summary: "{cause_summary}"
draft: true
---

# {一句话标题}

## 问题根因

{root_cause_detailed}

## 调试历程

{debug_path_with_failed_attempts}

## 最终解决方案

{resolution_steps}

## 防复发建议

{prevention_tips}

---
*本文档由永乐大典自动生成，待确认后归档。*
*Generated: {datetime}*
```

写入后显示：
```
✅ 草稿已生成: {DRAFT_PATH}
```

---

**Step 5: 人工审阅确认**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 永乐大典 ► 请审阅草稿
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 草稿路径: {DRAFT_PATH}

请在编辑器中打开并审阅，确认无误后执行以下命令正式归档：

  /yongle-confirm {DRAFT_PATH}

或者直接在此处回复"确认"跳过手动编辑。
```

等待用户回应：

```
AskUserQuestion(
  header: "永乐大典 — 正式归档",
  question: "草稿已生成，请审阅后做出选择：",
  options: [
    { label: "✅ 直接确认归档", description: "无需编辑，按当前草稿内容正式归档" },
    { label: "📝 我已手动编辑完毕，现在归档", description: "已在编辑器中修改，保存后在此确认" },
    { label: "⏳ 稍后归档", description: "保留草稿，稍后通过 /yongle-confirm 命令归档" }
  ],
  multiSelect: false
)
```

---

**Step 6: 正式归档**

若用户选择"直接确认归档"或"已编辑完毕现在归档"：

```bash
# 读取草稿（可能已被用户手动编辑）
FINAL_FILENAME="${TIMESTAMP}-${SLUG}.md"
FINAL_PATH="${ARCHIVE_DIR}/${FINAL_FILENAME}"

# 将 draft.md 重命名为正式 .md
mv "$DRAFT_PATH" "$FINAL_PATH"

# 从文件中去除 draft: true 标志
# （使用 gsd-sdk 或直接 sed 处理）
sed -i '/^draft: true$/d' "$FINAL_PATH"
```

更新知识库索引（`INDEX.md`）：
```bash
INDEX_PATH="${ARCHIVE_DIR}/INDEX.md"
# 在索引末尾追加新条目的摘要行
echo "| {date} | [{id}](./${FINAL_FILENAME}) | {resolution_type} | {cause_summary} | {tags_inline} |" >> "$INDEX_PATH"
```

如果 `INDEX.md` 不存在，先创建带表头的索引文件：
```markdown
# 永乐大典知识索引

| 日期 | 条目ID | 分类 | 根因摘要 | 标签 |
|------|--------|------|----------|------|
```

显示完成横幅：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 永乐大典 ► 归档完成 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 已归档: {FINAL_PATH}
📋 索引已更新: {INDEX_PATH}

下次遇到类似问题，可用 /yongle-search 快速检索。
```

若用户选择"稍后归档"，则草稿保留在 `{DRAFT_PATH}`，并提示：
```
草稿已保存，稍后通过 /yongle-confirm {DRAFT_PATH} 完成归档。
```

</process>

<notes>
- 上下文回溯由宿主大模型（如 Antigravity）直接执行，无需外部 API 调用
- 支持多轮补丁（一个 Bug 经历多次尝试）的整体打包提炼
- 草稿阶段允许用户手动编辑内容，最大程度保障知识质量
- INDEX.md 是轻量平铺式索引，未来可与 SQLite 联动
- 所有文件写入操作均通过系统工具（Bash/Write）完成，不依赖任何 npm 包
</notes>
