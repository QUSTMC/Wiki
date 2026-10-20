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

## R2 自动上传与浏览器直连

取数程序支持在保存本地文件后通过 S3 SigV4 PUT 上传同名 `UID.json`。在服务器 `/etc/qust-bili.env` 中添加：

```ini
R2_ENDPOINT=https://你的账户ID.r2.cloudflarestorage.com
R2_BUCKET=bili-get
R2_ACCESS_KEY_ID=你的访问密钥ID
R2_SECRET_ACCESS_KEY="你的机密访问密钥"
```

Endpoint 不含桶路径，必须使用 R2 S3 API HTTPS 地址。API 令牌应仅允许该桶的对象读写。配置文件保持 `root:root`、权限 `600`，不要放入公开目录或版本库。空 Secret 会跳过上传、保留本地取数；上传失败会保留新的本地文件并报告失败。下一次成功取数会重新尝试上传。上传对象设置 `Content-Type: application/json; charset=utf-8`、`Cache-Control: public, max-age=60`，不会上传 Cookie 或服务器环境文件。不要将 R2 密钥设为 `PUBLIC_*`。

Node 20 单文件部署需要重新打包上传，因为新增上传代码需要包含在 bundle 内。更新前备份原 bundle，更新后执行 `systemctl start bili-sync.service`，通过 `journalctl -u bili-sync.service -n 30 --no-pager` 查看 `uploaded public JSON`。没有该日志时不能视为已经上传。系统环境文件会在每次启动任务时重新读取，无须重启 Docker 或面板。

R2 桶自定义域名例如 `https://bili-get.aurelith.top`，桶根目录对象为 `1933142349.json`。按 `deploy/bili-r2-cors.json` 配置桶 CORS，网站构建环境设置 `PUBLIC_BILI_SNAPSHOT_BASE=https://bili-get.aurelith.top`，重新构建后组件直接读取 R2，不依赖 Worker。构建时也使用同一公开快照。根目录 404 正常，应测试具体对象 URL；在地址栏能打开对象不能代替跨域测试。上传后如曾缓存 404，应清除该对象在 Cloudflare 自定义域名的缓存再验证。

## 服务器无法连接 R2：通过 GitHub Actions 上传

若 B 站取数成功，但访问 R2 时在 TLS 握手阶段出现 `ECONNRESET` 或 `SSL_ERROR_SYSCALL`，尚未进入 R2 鉴权。先确认服务器网络出口；反复更换 R2 密钥不能解决此类错误。已有代理也必须先验证节点可用，不能只看代理进程正在运行。

仓库提供 `.github/workflows/bili-r2-sync.yml`：GitHub runner 读取服务器现有的公开 JSON，校验后上传 R2。服务器继续每 10 分钟取数，浏览器继续直接读 R2；无须在服务器安装代理或替换其他服务。工作流不安装 npm 依赖、不提交 JSON、不触发网站重新构建，也不需要 B 站 Cookie。服务器提供的快照 URL 必须能从公网访问。

将代码提交到 GitHub 默认分支后，在仓库 **Settings → Secrets and variables → Actions** 配置：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Variable | `BILI_MIRROR_SOURCE` | `http://47.105.123.24:20003/bili`，仅包含公开动态的目录 |
| Variable | `R2_ENDPOINT` | `https://你的账户ID.r2.cloudflarestorage.com`，不含桶名 |
| Secret | `R2_ACCESS_KEY_ID` | 具有 `bili-get` 桶对象读写权限的访问密钥 ID |
| Secret | `R2_SECRET_ACCESS_KEY` | 对应的机密访问密钥 |

当前工作流固定桶名 `bili-get`、UID `1933142349`，更换账号或桶时需同时修改工作流。密钥从原来保存在服务器的配置中取用，直接填到 GitHub Secrets，不发到聊天、不提交到仓库。源地址只读取公开内容，上传凭据仅发给 R2；HTTP 源不提供传输加密，条件允许时应改用 HTTPS。

先到 **Actions → Sync Bilibili snapshots to R2 → Run workflow** 手动运行。确认日志出现 `uploaded public JSON`，且 `https://bili-get.aurelith.top/1933142349.json` 返回非空动态后，再添加 Variable `BILI_R2_SYNC_ENABLED=true` 开启定时上传。默认每小时第 7、17、27、37、47、57 分钟触发；GitHub 调度可能延迟，服务器取数与上传合计延迟通常约 0–20 分钟，不能保证准点。公开仓库长期无活动时，GitHub 可能暂停定时工作流；应关注 Actions 的失败和停用通知。私有仓库需留意 Actions 分钟额度。

`scripts/bili-r2-mirror.mjs` 拒绝超过 30 分钟、空列表、UID 不符、格式错误或请求失败的快照，失败退出且保留旧 R2 对象；保留原始 `fetchedAt`，不会把旧数据伪装为刚获取。`node --test tests/bili-r2-mirror.test.mjs` 验证读取、校验和上传流程。

验证上述上传成功后，在服务器 `/etc/qust-bili.env` 中将 `R2_ENDPOINT` 留空，即可关闭服务器直传，避免重复尝试失败；保留取数定时器和 HTTP 快照服务。无需重启 Docker、代理、面板或现有网站。停用 GitHub 定时上传时，删除或设 `BILI_R2_SYNC_ENABLED=false`。

网站仍需设置构建变量 `PUBLIC_BILI_SNAPSHOT_BASE=https://bili-get.aurelith.top`，配置桶的 GET/HEAD CORS 后重新构建；这些步骤与谁负责上传无关。

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
