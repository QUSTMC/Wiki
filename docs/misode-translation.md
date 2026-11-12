# Misode 中文翻译流程

## 本地模型与范围

使用 OpenAI 兼容接口 `http://198.18.0.1:1234/v1/chat/completions`，模型 `google/gemma-4-12b-qat`，不使用工具调用。翻译脚本为 `scripts/translate-misode.mjs`，只在人工执行时调用模型；正常构建、Cloudflare 部署和上游更新 PR 都不访问该接口。

首阶段只补齐上游 `en.json` 中现有 `zh-cn.json` 缺失的界面条目，不重译已有中文。源码中硬编码英文、远程 schema 文档和游戏版本数据是另外的翻译范围，不计入语言表覆盖率。

## TAG 上下文

- `rules`：输出规则、简体中文风格及保护标记约束。
- `product`：Misode / Minecraft 数据包界面上下文。
- `glossary_by_key`：按照 source 英文词边界、最长且不重叠规则检索到的术语及 reason。
- `existing_translations`：相关现有译文，供一致性参考。
- `translation_memory`：`Vanilla/latest.tsv` 的原版实体、物品、方块名称参考；这不是术语表。
- `source`：带稳定 ID 的待译 JSON，文件名、占位符、代码等预先替换为保护标记。
- `translations`：模型唯一需要返回的 JSON 结果。

术语库默认在 `D:/.WORKSPACE/Glossary`，遵循 `Docs/TERMS_SPEC.md`。特殊分表仅在 key 包含对应 token 时启用；不合并进通用表。模组指南在模组相关或 worldgen 语境中按需检索，并检查 Source：来源不匹配的专用词条不注入，如匠魂的 Modifier=强化不会用于 Loot Modifier。术语 `zh` 的 `|` 是可接受表面变体，不作为字面译文。历史版本差异和 QA 规则不是通用术语，不混入主表。

## 后处理与审查

程序检查完整 key 集合、非空字符串、保护标记的遗漏/重复、还原后的文件名/URL/代码/占位符集合。格式校验失败会重试一次；仍不合格则停止该批，不写入该批结果。小批次保存，可在中断后继续未完成条目。

术语缺失仅记录候选，不执行全局替换，不将启发式命中视为正确性证明。比如“鸡子”这样的不当措辞即使满足 JSON 和术语子串检查也可能漏过，仍需要复核；原版标准实体名记忆能改善这一类错误。语义不明的模组缩写或专名也需要单独确认。

提示词、模型输出（不保存推理内容）、模型 token 用量和候选警告写入 `.astro/misode-translations/` 的每次运行记录及 `latest.json`。该目录不提交。术语库保持只读。

## 运行

```pwsh
node scripts/translate-misode.mjs --dry-run --limit 8
node scripts/translate-misode.mjs --write
node scripts/translate-misode.mjs --limit 8 --retranslate --write
```

支持 `--glossary`、`--endpoint`、`--model`、`--batch-size`（默认 8）、`--keys`（逗号分隔的 key）和 `--limit`。不加 `--write` 时只产生候选与本地审计记录。

## 独立覆盖层

译文位于 `src/i18n/misode/zh-cn.json`，每项保存 `source` 和 `translation`。无需把整个术语库复制进项目，也不会修改上游 locale 文件。

`scripts/misode-vite.config.mjs` 加载上游 Vite 配置，在构建期间通过插件合并本站译文。只有当前英文与记录的 `source` 一致才应用；英文变化或 key 删除时跳过旧译文并给出构建警告，等待复核。`scripts/build-misode.mjs` 的缓存指纹包含覆盖层和插件代码。

因此上游更新 PR 不会覆盖本站译文；它也不会让本地 LM Studio 或 D 盘术语库成为生产构建依赖。完整构建仍使用 `npm run build`。更新流程会运行 `tests/misode-i18n.test.mjs`，验证术语作用域、保护标记与过期译文处理。

首批模型候选共 36 项。33 项接入；JSG RIG Waves、Pixelmon Raid Ally Set 与 Pixelmon Raid Spawn Set 三项标记 `review: needs-context`，页面继续回退英文。`Sounds.json` 和模组专名有意保留原文，不属于漏译。需要人工确认的候选不计入已采用译文。

## 进度生成器字段和说明

`advancement-source.json` 提取自 vanilla-mcdoc 的进度本体、显示设置、图标、判据和奖励，共 35 项。提取来源与 schema ref 记录于 `advancement-provenance.json`。本地模型译文保存在 `advancement-zh-cn.json`，仍保留原文以供精确匹配。

`scripts/misode-schema-runtime.mjs` 只为 `/misode/advancement/` 的简体中文显示标签和帮助文字提供译文。说明按“字段名 + 完整英文”匹配；文档更新后未命中的部分保留英文。动态的用户自定义字段不翻译。Markdown 中的 JSON 键、布尔值等代码标识原样保留。

构建插件在内存中适配 McdocRenderer 的 Key 显示组件，不写入 vendor 文件、不修改 Schema、不改变数据编辑逻辑。语言菜单切换时标签和提示会跟随切换。上游显示组件结构改变时构建中止并提示维护，避免静默失效。

模型请求可使用 `--source-file`、`--output-file` 和 `--context` 指定字段文档批次。此阶段未覆盖所有触发器条件、其他生成器或整个远程 Schema。


## 常用生成器补译与首页声明

第二批 `common-source.json` / `common-zh-cn.json` 覆盖战利品表、配方、物品修饰器、谓词和包元数据的基础字段，共 71 项显示标签及说明。来源符号与适用路径见 `common-provenance.json`。不代表每个生成器的所有子类型、枚举或外部文档均已汉化。

按用户要求采用风险抽检：重点检查 all/any 条件、范围是否含端点、布尔默认值、包格式版本兼容、配方原料/产物语义，以及模型保护标记和术语警告；不逐条人工重译全部内容。模型使用本地 `google/gemma-4-12b-qat`，不依赖工具调用。

Misode 首页在独立构建插件中注入汉化来源声明，说明本站补充汉化由本地 AI 结合 [CFPAOrg/Glossary](https://github.com/CFPAOrg/Glossary) 的术语和参考资料生成，可能存在错误。原版已有中文不宣称为本地 AI 的产物。声明与样式位于 vendor 之外，自动更新 PR 不会覆盖。


首页另外提取了六张工具卡片的标题和简介，共 12 项，位于 `home-source.json` 和 `home-zh-cn.json`。构建插件只适配对应显示属性，中文模式应用译文，其他语言保留上游原文。包筛选中的 block 表示屏蔽规则而非方块，因此暂时保留该字段英文，避免错误套用通用方块译法。
