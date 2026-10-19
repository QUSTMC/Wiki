# Linux 服务器取数与 Cloudflare 快照模式

适用于 Ubuntu / Debian + systemd + Nginx。服务器负责访问 B 站，Cloudflare 的静态页面和 Worker 保持原有部署方式。必须先确认这台服务器能够取数；换服务器不能保证自动解除 B 站风控。

## 1. 准备程序与目录

需要 Node.js **24 或更新的 LTS**、Git、Nginx。脚本使用 Node 原生 TypeScript 支持，无须安装项目的 npm 依赖。以下示例假设 Node 可执行文件是 `/usr/bin/node`，先用 `/usr/bin/node --version` 确认；若安装位置不同，修改 `bili-sync.service` 中的绝对路径。不要使用仅在交互终端加载的 nvm 路径而不修改服务。

先将本次项目修改同步到仓库或手动上传服务器，再执行：

```sh
sudo git clone https://github.com/QUSTMC/QUSTWIKI.git /opt/qust-bili
sudo useradd --system --no-create-home --shell /usr/sbin/nologin qust-bili
sudo install -d -o qust-bili -g qust-bili -m 755 /var/lib/qust-bili
sudo install -m 600 /opt/qust-bili/deploy/bili.env.example /etc/qust-bili.env
sudoedit /etc/qust-bili.env
```

已有仓库或用户时跳过相应创建步骤。`/opt/qust-bili` 及源码需对 `qust-bili` 用户可读。环境文件内容：

```ini
BILI_ALLOWED_UIDS=1933142349
BILI_SNAPSHOT_DIR=/var/lib/qust-bili
BILI_COOKIE="这里填写完整 Cookie 值，不带 Cookie: 前缀"
```

Cookie 放在 `/etc`，不要放入公开 JSON 目录。脚本也支持留空 Cookie 使用访客身份。配置文件由 systemd 以管理员权限读取，再以专用用户运行任务。

## 2. 手动验证一次取数

```sh
sudo install -m 644 /opt/qust-bili/deploy/bili-sync.service /etc/systemd/system/bili-sync.service
sudo install -m 644 /opt/qust-bili/deploy/bili-sync.timer /etc/systemd/system/bili-sync.timer
sudo systemctl daemon-reload
sudo systemctl start bili-sync.service
sudo journalctl -u bili-sync.service -n 30 --no-pager
```

成功时日志显示 `saved N dynamics`，并生成 `/var/lib/qust-bili/1933142349.json`。`N` 应大于 0；首次得到 0 条不能视为已验证可用。失败时查看 `[BiliDynamic]` 中的阶段、状态码和业务码，不要继续启用定时任务掩盖失败。

每次最多整理最新 20 条混合动态；接口的 `video`、`image` 筛选基于这批快照，因此结果可能不足请求数量。HTTP 失败不会覆盖已有文件；成功空列表也不会覆盖原来的非空文件。文件通过临时文件写入后重命名，避免读取到写了一半的内容。

## 3. 通过现有 HTTPS 网站提供 JSON

将 `deploy/bili-nginx.conf.example` 的两个 `location` 放入一个现有 HTTPS 站点的 `server {}` 中，保持该站点原有证书配置。示例访问地址为 `https://data.example.com/bili/1933142349.json`，将域名换成自己的域名。只公开指定命名的 JSON 文件，不要将项目或 `/etc` 目录配置为网站根目录。

```sh
sudo nginx -t
sudo systemctl reload nginx
curl --fail https://data.example.com/bili/1933142349.json
```

确认返回 `success: true`、`uid: "1933142349"` 和非空 `items`。只有静态快照需要公开，Cookie 不随 JSON 返回。浏览器不直接请求该服务器，无须配置 CORS。若使用面板管理 Nginx，在对应站点配置中添加规则；以面板实际 reload 方式为准。快照地址须能被 Cloudflare 服务端正常访问，不要要求浏览器验证码或登录。

## 4. 开启定时任务

手动取数和 HTTPS 访问均成功后：

```sh
sudo systemctl enable --now bili-sync.timer
sudo systemctl list-timers bili-sync.timer
```

默认开机 2 分钟后执行一次，以后每次任务完成后间隔 10 分钟执行；同一服务不会重叠运行。不需要开放 Node 端口。更新 Cookie 后，下次任务会重新读取；也可 `sudo systemctl start bili-sync.service` 手动运行。

## 5. Cloudflare 配置与重新部署

在 **Worker 生产运行时变量**和 **Builds 构建变量**两处增加普通变量：

```ini
BILI_SNAPSHOT_BASE=https://data.example.com/bili
```

此变量填目录，不带 `1933142349.json`。保留 `BILI_ALLOWED_UIDS=1933142349`。在快照模式下 Worker 不再直接请求 B 站，也不会将已有 `BILI_COOKIE` 发给快照服务器。构建阶段如设置了 `BILI_API_BASE`，优先尝试该网站 API；失败后仍会读取 `BILI_SNAPSHOT_BASE`，不会降级为直连 B 站。

同步本次代码并重新构建、部署。验证 `https://qustmc.aurelith.top/api/bili?uid=1933142349&limit=10&type=all` 返回动态，再检查首页。

Worker 缓存快照 5 分钟，浏览器缓存 60 秒，源站示例缓存 60 秒，所以更新不会立即可见。源快照超过 30 分钟标记 `stale`；浏览器已有动态时不使用它覆盖当前内容，但首屏无数据时仍可显示。超过 24 小时则拒绝使用，需修复取数任务。

常见错误：`BILI_SNAPSHOT_CONFIG` 为地址配置不正确；`BILI_SNAPSHOT_UNAVAILABLE` 为快照地址访问失败、非 JSON 或重定向；`BILI_SNAPSHOT_INVALID` 为内容不匹配；`BILI_SNAPSHOT_EXPIRED` 为取数停止超过 24 小时。失败时保留可用边缘缓存，但不会把旧快照伪装为刚更新。

恢复直连模式时，在运行时和构建环境两处移除 `BILI_SNAPSHOT_BASE` 并重新部署即可。

## 无域名：使用独立 HTTP 快照服务

没有域名时可用 `http://服务器IP:20003/bili` 作为 `BILI_SNAPSHOT_BASE`。浏览器仍请求网站同源 HTTPS API，由 Worker 在服务端读取 HTTP JSON，不产生浏览器混合内容问题。HTTP 仅承载公开动态；Cookie 不会发送给快照服务器。HTTPS 可用时仍优先使用 HTTPS。

`scripts/bili-http.mjs` 可在 Node.js 20+ 运行，只提供 `/bili/数字UID.json` 的 GET/HEAD，不开放文件列表、环境文件或其他路径。对应 `deploy/bili-http.service` 使用独立进程和专用用户，无须启动或重载现有 Nginx。默认端口 20003，安装前先检查端口未被占用；如需更改，在 service 的 `Environment=BILI_HTTP_PORT=...` 中调整。

```sh
sudo install -m 644 /opt/qust-bili/deploy/bili-http.service /etc/systemd/system/bili-http.service
sudo systemctl daemon-reload
sudo systemctl enable --now bili-http.service
curl --fail http://127.0.0.1:20003/bili/1933142349.json
```

本机成功、公网超时时，需要检查实例安全组及本机防火墙是否允许入方向 TCP 20003。只添加该端口所需的规则，不清空规则或停用现有防火墙。Cloudflare 读取公开 JSON 需要公网可达，源站不要求 CORS。

取数源码 `bili-sync.mjs` 直接导入 TypeScript，仍要求 Node 24+。若已有 Node 20、希望保留现有版本，可在开发机用项目已有的 esbuild 打包，再上传单文件（不需要在服务器安装 npm 依赖）：

```sh
npx esbuild scripts/bili-sync.mjs --bundle --platform=node --target=node20 --format=esm --outfile=deploy/bili-sync.node20.mjs
```

将生成文件上传到 `/opt/qust-bili/scripts/bili-sync.node20.mjs`，备份原服务文件后，将 `bili-sync.service` 的 `ExecStart` 改为 `/usr/bin/node /opt/qust-bili/scripts/bili-sync.node20.mjs`，再 `systemctl daemon-reload`。该单文件模式要求 Node 20.3+，不替换系统 Node。更新取数逻辑时需要重新打包、上传。可用 `systemctl disable --now bili-sync.timer bili-http.service` 停止本方案的定时任务和 HTTP 服务，不涉及 Docker 或其他网站服务。
