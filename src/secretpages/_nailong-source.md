# 奶龙快跑 3：来源与维护

- 原仓库：https://github.com/Kazuha233/nailong-run-3.0/
- 原作者：随枫（Kazuha233），Copyright (c) 2026。
- 导入版本：master，提交 `2c3aebc9b08143618dd1947f0a1dfc7eb4549bfe`。
- 页面：`src/secretpages/奶龙.html`，访问路径 `/s/奶龙/`。
- 静态资源：`public/s/_nailong/`，包括原版 assets、四个 dev-tools 脚本、manifest 和 LICENSE。
- 原始许可：`public/s/_nailong/LICENSE`，Nailong Run License（自定义非商业许可）。

集成改动：资源引用改为本站绝对路径；manifest 的入口和作用域改为游戏路径；添加 noindex/nofollow 和主菜单来源链接；停用原版 Service Worker 注册，避免其清理 Wiki 同域缓存。移除账号注册/登录、头像、排行榜、成绩上传、登录礼包及所有云端同步，开场结束后直接进入主菜单。保留本地成就、强化、角色与最高分存档，沿用已有 localStorage 数据格式；移除依赖头像和排行榜的成就，并调整全成就判定。未复制 APK、备用音频和服务端源码。

游戏运行仅加载本站资源，不访问原作者的 Supabase 服务。原仓库链接与手机版按钮仍由用户主动点击后打开外部站点。存档仅保存在当前浏览器，清除站点数据会删除存档，不支持跨设备同步。未提供离线 Service Worker。更新上游时，请保留这些本地化改动并检查许可和资源路径。

本文件以下划线开头，不生成隐藏页面路由。隐藏页面仅从导航和搜索排除，并非访问权限控制。
