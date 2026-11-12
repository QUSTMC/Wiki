# Misode 本地集成

原仓库：https://github.com/misode/misode.github.io

导入分支：master；提交：`65a10e06ccd03845784a2f838f52b0bda0aa25f3`。保留 MIT LICENSE 和原作者署名。

访问 `/misode/`，从 `/tools/` 导航页进入。源码保存在本目录，后续修改可直接编辑；应用保持独立 Preact/Vite 构建，不与 Starlight CSS 混合。

在项目根目录执行 `npm run build` 或 `npm run dev`，Astro 集成会按 package-lock.json 自动安装子项目依赖、构建到 public/misode，再由 Astro 输出到 dist/misode。生成目录不提交；构建指纹避免重复打包。使用 Node 22.12+（或 24+）。已有的 Cloudflare `npm run build` 命令无需更改，但第一次构建需要下载子项目依赖。

本地适配：Vite base、子路径路由适配层 src/qust/Router.tsx、public 资源路径、ESM 构建配置、独立构建缓存、Wiki 返回链接。停用原站 Google Analytics、广告脚本及关联原站讨论的 Giscus，保留原版生成器、编辑器、语言和版本功能。

Minecraft 版本元数据、schema、预览资源仍从上游 mcmeta/vanilla-mcdoc 等公开服务读取；分享仍使用上游 snippets 服务。本次不是离线数据镜像。网络不可达时相关生成器或预览会受影响。

修改源码后重新启动开发服务器，或运行 `node scripts/build-misode.mjs` 重新打包。更新上游时保留本文件和适配层，重新检查子路径导航、深层 URL 刷新、JSON 生成/导入导出和外部服务依赖。

## 自动更新

工作流 `.github/workflows/update-misode.yml` 每天北京时间 11:23 检查上游 master，也可在 GitHub Actions 中手动运行。GitHub 定时任务可能延迟。有新提交时，以 `vendor/misode-upstream.json` 的 revision 为基线进行三方合并，保留本站修改及后续自定义内容；不是用上游文件直接覆盖本站。

冲突时中止，不写入半成品；无冲突时执行 Misode TypeScript 检查、完整 Astro 构建及 Chromium 导航/生成器测试，全部通过后创建或更新同一个 `codex/update-misode` 分支的 PR。不会自动合并。故障会显示在 Actions 的失败记录中。

工作流必须先提交到默认分支才会开始定时运行。请在 GitHub Settings → Actions → General → Workflow permissions 中启用 “Allow GitHub Actions to create and approve pull requests”；组织策略也需要允许创建 PR。无需额外 PAT，使用内置 GITHUB_TOKEN。该令牌创建的 PR 通常不会触发其他 push/pull_request 工作流，因此更新验证在本工作流内完成。

更新逻辑位于 `scripts/update-misode.mjs`。更新 PR 中同时审核源码、上游 revision 和预览效果；解决冲突后不要只修改 revision 而跳过对应代码更新。
