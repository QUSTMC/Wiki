---
title: Prime Backup 备份与回档
description: Prime Backup 插件的指令与配置文件说明
---

Prime Backup（简称 PB）是服务器的**存档备份 / 回档插件**。它会给存档做增量、去重的快照，误拆、炸图、插件事故都能一键回滚。

**官方文档：** [Prime Backup 中文 Wiki](https://tisunion.github.io/PrimeBackup/zh/) ｜ [GitHub](https://github.com/TISUnion/PrimeBackup)

:::note
下文所有命令都假定前缀为 `!!pb`（可在配置里修改）。命令在游戏内聊天栏或 MCDR 控制台输入均可。
:::

## 30 秒速查

| 我想做什么 | 命令 |
| --- | --- |
| 立刻存一个备份 | `!!pb make 香猪烤好了` |
| 看看有哪些备份 | `!!pb list` |
| 看某个备份的详情 | `!!pb show 45` |
| 回档 | `!!pb back 78` → `!!pb confirm` |
| 改备份的注释 | `!!pb rename 78 新注释` |
| 删掉某个备份 | `!!pb delete 78` → `!!pb confirm` |
| 让某个备份不被自动清理 | `!!pb tag 78 protected set true` |
| 看备份一共占了多大空间 | `!!pb database overview` |

更完整的指令说明见官方 [指令](https://tisunion.github.io/PrimeBackup/zh/command/) 与 [功能列表](https://tisunion.github.io/PrimeBackup/zh/feature/) 页面。

---

## 权限要求

每个子命令都有最低权限等级要求，默认如下（可在配置的 `command.permission` 里改）：

| 命令 | 权限等级 | 命令 | 权限等级 |
| --- | --- | --- | --- |
| `!!pb`（根命令） | 0 | `delete` | 2 |
| `make` / `list` / `show` | 1 | `delete_range` | 3 |
| `confirm` / `abort` | 1 | `prune` | 3 |
| `back` | 2 | `tag` | 3 |
| `rename` | 2 | `database` | 4 |
|  |  | `export` | 4 |

未列出的子命令默认按等级 `1` 处理。也就是说：**普通玩家能建备份和查列表，回档要 2 级以上，动数据库要 4 级（管理员）。**

---

## 备份 ID 的写法

几乎所有命令都要填备份 ID，支持三种写法：

| 写法 | 示例 | 含义 |
| --- | --- | --- |
| 正整数 | `12` | ID 为 12 的备份 |
| `~` 或 `latest` | `!!pb back ~` | 最新的**非临时**备份 |
| 相对偏移 | `!!pb back ~3` | 最新备份往前数第 3 个备份 |

---

## 创建备份

```plaintext
!!pb make
!!pb make 香猪烤好了
```

带注释会方便日后辨认，强烈建议养成习惯。执行时 PB 会先关闭自动保存 → 触发 `save-all flush` → 等存档落盘 → 创建快照 → 恢复自动保存，全程通常只要几秒，不必停服。

创建完用 `!!pb list` 或 `!!pb show` 就能看到。

相关配置：`backup.targets`（备份哪些目录）、`backup.hash_method`、`backup.compress_method`、`server.turn_off_auto_save`。

---

## 查看备份

### 备份列表

```plaintext
!!pb list
!!pb list --per-page 20
!!pb list --creator player:Fallen_Breath
!!pb list --from 20240101 --to 20240131
!!pb list --all --flags
```

| 参数 | 说明 |
| --- | --- |
| `[页码]` | 查看指定页 |
| `--per-page <数量>` | 每页显示数量（1-1000） |
| `--sort <排序>` | `id`、`id_r`、`time`、`time_r`（默认，按时间倒序） |
| `--creator <创建者>` | 只看某人建的备份，如 `console:`、`player:Steve` |
| `--me` | 只看自己建的 |
| `--from` / `--to` | 时间范围，如 `20240101`、`2023-11-30`、`202311` 都认 |
| `-a, --all` | 包含隐藏备份和临时备份 |
| `--flag, --flags` | 显示备份标志位 |

列表里每一行的格式是 `[#ID] [>] [x] [标志位] 大小 创建时间: 注释`，其中 `[>]` 是**点击回档**、`[x]` 是**点击删除**（受保护的备份按钮是灰的）。

标志位含义：

| 标志 | 含义 |
| --- | --- |
| `H` | 隐藏备份 |
| `T` | 临时备份 |
| `P` | 受保护备份 |
| `S` | 定时备份 |

### 备份详情

```plaintext
!!pb show 45
```

会显示创建日期、注释、存储大小（压缩后）、原始大小、创建者和标签。

---

## 回档

```plaintext
!!pb back 78
!!pb confirm
```

不带 ID 的 `!!pb back` 等价于回档到**最新的非临时备份**。

:::caution
回档会**停服再重启**，并且会覆盖当前存档。执行前务必确认选对了备份。
:::

完整流程是这样的：

- 输入 `!!pb back <ID>`，PB 显示目标备份信息，要求在 1 分钟内（`command.confirm_time_wait`）确认
- 输入 `!!pb confirm` 确认，或 `!!pb abort` 取消
- 服务器倒计时 10 秒（`restore.countdown_sec`）后关闭
- PB **自动为当前存档建一个临时备份**（`restore.create_pre_restore_backup`，默认开启），注释形如「回档至#78前的自动备份」
- 执行回档
- 服务器重新启动

也就是说，就算回档错了，也能再回档到那个临时备份把现状找回来。

可选参数：

| 参数 | 说明 |
| --- | --- |
| `--confirm` | 跳过确认步骤，直接开始回档 |
| `--fail-soft` | 导出时跳过失败的文件 |
| `--no-verify` | 不校验导出文件内容（快一点，但少一道保险） |

```plaintext
!!pb back 12 --confirm --fail-soft
```

---

## 删除备份

```plaintext
!!pb delete 78
!!pb confirm
```

删除需要确认。**受保护备份（带 `P` 标志）不会被删除。**

批量删除用 `delete_range`，ID 范围写法：

```plaintext
!!pb delete_range 60-70     # 删除 60 到 70
!!pb delete_range -50       # 删除 50 及以前的所有
!!pb delete_range 80-       # 删除 80 及以后（含）的所有
!!pb delete_range [10, 20]  # 删除 10 到 20
!!pb delete_range *         # 全部
```

:::danger
`*` 是删除**全部**备份，别手滑。
:::

---

## 重命名备份

```plaintext
!!pb rename 78 仓储重构完成
```

---

## 备份标签

标签用来标记备份的性质，共四种，都是布尔值：

| 标签 | 标志 | 作用 |
| --- | --- | --- |
| `hidden` | H | 隐藏备份，不出现在普通列表里 |
| `temporary` | T | 临时备份（回档前的自动备份就带这个） |
| `protected` | P | **受保护备份**：不会被删除，清理时也会跳过 |
| `scheduled` | S | 定时备份 |

```plaintext
!!pb tag 78                        # 查看备份 78 的所有标签
!!pb tag 78 protected set true     # 设为受保护
!!pb tag 78 protected clear        # 清除标签
```

:::tip
遇到一个「绝对不能丢」的备份（比如大工程完工的节点），打个 `protected` 标签最省心：它不会被 `!!pb delete` 删掉，也不会被自动清理策略清掉。
:::

---

## 对比两个备份

```plaintext
!!pb diff 45 78
```

展示两个备份之间文件的变化情况，用于排查「什么时候开始的改动」。

---

## 导出与导入

把备份导出成独立的压缩包文件，方便拷走或存档：

```plaintext
!!pb export 78 tar_zst
!!pb export 78 zip --overwrite
```

支持的格式：`tar`、`tar_gz`、`tar_bz2`、`tar_xz`、`tar_zst`、`zip`。不写格式也能导出。可选参数 `--overwrite`（覆盖已有文件）、`--no-meta`（不附带元信息）、`--fail-soft`、`--no-verify`。

导出的文件再导入回来：

```plaintext
!!pb import "pb_files/export/78.tar.zst"
```

导入时可加 `--auto-meta` 或 `--meta-override '{...}'` 来指定备份的元信息。

---

## 手动清理

```plaintext
!!pb prune
```

按配置的清理策略（`prune` 小节）立即清理一遍过时备份。正常情况不需要手动执行——PB 会按 `prune.interval` 自动清理。

---

## 查看定时作业

```plaintext
!!pb crontab                          # 列出所有定时作业及下次执行时间
!!pb crontab schedule_backup pause    # 暂停定时备份
!!pb crontab schedule_backup resume   # 恢复
```

作业 ID：`schedule_backup`（定时备份）、`prune_backup`（备份清理）、`vacuum_sqlite`（数据库精简）、`create_db_backup`（数据库备份）、`compact_pack`（打包文件整理）。

---

## 数据库命令

### 概览

```plaintext
!!pb database overview
```

一次看清备份总数、去重率、压缩率、数据对象数、打包文件数等。想知道「备份到底吃了多少磁盘」就用它。

### 审查内部对象

```plaintext
!!pb database inspect backup 45                 # 备份详情
!!pb database inspect file 45 world/level.dat   # 备份中某个文件
!!pb database inspect fileset 87                # 文件集
!!pb database inspect blob 8a3d                 # 数据对象（哈希前缀即可）
!!pb database inspect pack 12                   # 打包文件
```

`blob` 的哈希可以只写前缀，只要能唯一定位；写太短 PB 会把候选列出来。

### 验证完整性

```plaintext
!!pb database validate all
!!pb database validate blobs
```

`all` 之外还可单独验证 `packs`、`blobs`、`chunks`、`files`、`filesets`、`backups`。发现问题时详细报告会写进 `pb_files/logs/validate.log`。

### 清理与整理

```plaintext
!!pb database prune           # 清理孤立数据（一般无需手动执行）
!!pb database vacuum          # 精简 SQLite 数据库文件，回收空间
!!pb database compact_packs   # 整理打包文件（手动维护用）
```

### 删除备份中的文件

```plaintext
!!pb database delete file 59 world/cache/file.txt
!!pb database delete file 59 world/cache --recursive
```

删目录必须加 `--recursive`，不能删备份的根目录，且需要确认。

### 迁移哈希 / 压缩算法

```plaintext
!!pb database migrate_hash_method blake3
!!pb database migrate_compress_method zstd
```

:::danger
迁移会影响全部已有备份，耗时长且**不可中断**，操作前先另做一份完整备份。

另外，`hash_method` **不能直接改配置文件**，直接改会导致 PB 加载失败，必须走 `migrate_hash_method`；`compress_method` 可以直接改，但只影响之后新增的文件。
:::

---

## 配置文件

### 位置与启用

配置文件在 `config/prime_backup/config.json`，插件首次被 MCDR 加载时自动生成，是标准 JSON。

改完后执行重载生效：

```plaintext
!!MCDR plugin reload prime_backup
```

:::caution
`enabled` 默认是 `false`，**必须改成 `true` 插件才会开始工作**。
:::

### 根配置

```json
{
    "enabled": true,
    "debug": false,
    "storage_root": "./pb_files",
    "concurrency": 1
}
```

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | bool | `false` | 插件开关 |
| `debug` | bool | `false` | 调试日志 |
| `storage_root` | str | `"./pb_files"` | 备份数据存放的根目录，相对于 MCDR 工作目录 |
| `concurrency` | int | `1` | 最大并发数，调到 `4` 之类能加快备份/回档，但更吃 CPU；`0` 表示用一半 CPU |

### 命令与权限

```json
{
    "prefix": "!!pb",
    "permission": {
        "root": 0, "abort": 1, "back": 2, "confirm": 1, "database": 4,
        "delete": 2, "delete_range": 3, "export": 4, "list": 1,
        "make": 1, "prune": 3, "rename": 2, "show": 1, "tag": 3
    },
    "confirm_time_wait": "1m"
}
```

`prefix` 一般不用动；`permission` 见上文权限表；`confirm_time_wait` 是 `!!pb confirm` 的最长等待时间，超时自动取消。

### 备份配置

```json
{
    "source_root": "./server",
    "targets": ["world"],
    "ignore_patterns": ["session.lock"],
    "retain_patterns": [],
    "hash_method": "blake3",
    "compress_method": "zstd",
    "compress_threshold": 64
}
```

**`targets`（必改）**：要备份什么。默认只备份 `world`，按实际存档文件夹名改，多维度分离的服务端要写全：

```json
"targets": ["world", "world_nether", "world_the_end"]
```

也支持 gitignore 风格通配符，例如 `"world*"`。

**`hash_method`**：哈希算法，决定「相同文件能否被复用」。

| 值 | 速度 | 密码学安全 | 说明 |
| --- | --- | --- | --- |
| `xxh128` | ★★★★★ | × | 最快，推荐追求极致速度时用 |
| `sha256` | ★★ | √ | 经典，CPU 有硬件加速时也不慢 |
| `blake3` | ★★★☆ | √ | 速度与安全的平衡，默认推荐 |

**`compress_method`**：压缩算法。

| 值 | 速度 | 压缩率 |
| --- | --- | --- |
| `plain` | ★★★★★ | ☆ |
| `lz4` | ★★★★ | ★★☆ |
| `zstd` | ★★★☆ | ★★★★ |
| `gzip` | ★★ | ★★★★ |
| `lzma` | ☆ | ★★★★★ |

:::caution
这两个选项建议**在建第一个备份之前就定好**。改哈希算法必须走 `migrate_hash_method`，改压缩算法只影响之后的新文件。
:::

**`ignore_patterns` 与 `retain_patterns`**（都是 gitignore 风格，相对于 `source_root` 匹配，如 `world/trash*.obj`）：

| 选项 | 用途 | 备份时忽略 | 回档时保留 |
| --- | --- | --- | --- |
| `ignore_patterns` | 抛弃无用数据 | √ | × |
| `retain_patterns` | 忽略但保留，不进备份 | √ | √ |

:::caution
被 `ignore_patterns` 匹配的文件**回档后会消失**（目标目录只剩下备份过的内容）。只是不想备份、但想留下的东西（比如网页地图渲染输出、模组的大体积数据库）请用 `retain_patterns`。
:::

其他常用项：

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `source_root` | `"./server"` | 备份来源根目录，通常是服务端工作目录 |
| `creation_skip_missing_file` | `false` | 备份时跳过「文件突然不存在」的错误 |
| `reuse_stat_unchanged_file` | `false` | 复用 stat 未变的文件来提速，有备份不完整的风险，不建议开 |
| `chunking_enabled` | `false` | 对大文件启用分块存储以提升去重率 |
| `compress_threshold` | `64` | 小于此字节数的文件不压缩 |

### 服务器配置

```json
{
    "turn_off_auto_save": true,
    "commands": {
        "save_all_worlds": "save-all flush",
        "auto_save_off": "save-off",
        "auto_save_on": "save-on"
    },
    "saved_world_regex": ["Saved the game", "Saved the world", "System chat: Saved the game"],
    "save_world_max_wait": "10m"
}
```

`turn_off_auto_save` 建议保持 `true`，保证备份期间存档不再变动。`saved_world_regex` 用于判断「存档保存完了」，正则为全串匹配。

### 回档配置

```json
{
    "destination_root": null,
    "create_pre_restore_backup": true,
    "countdown_sec": 10,
    "reuse_unchanged_files": false
}
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `destination_root` | `null` | 回档到哪个目录，`null` 表示用 `backup.source_root` |
| `create_pre_restore_backup` | `true` | 回档前先给现状建一个临时备份，**强烈建议保持开启** |
| `countdown_sec` | `10` | 停服前的倒计时秒数 |
| `reuse_unchanged_files` | `false` | 复用内容未变的文件以减少写入，会让回滚逻辑变复杂，默认关闭 |

### 定时备份

```json
{
    "enabled": false,
    "interval": "12h",
    "crontab": null,
    "jitter": "10s",
    "reset_timer_on_backup": true,
    "require_online_players": false,
    "require_online_players_blacklist": []
}
```

默认关闭。想开启就把 `enabled` 改成 `true`，然后二选一：用 `interval`（间隔模式，如 `"12h"`）或用 `crontab`（定时模式，如 `"0 4 * * *"` 表示每天凌晨 4 点）。

`require_online_players` 设为 `true` 时，没人在线就跳过定时备份（需插件在开服前加载，或装有 MinecraftDataAPI）。`require_online_players_blacklist` 可以排除假人，例如 `["bot_.*"]` 让 carpet 假人不算「有人在线」。

### 清理策略

```json
{
    "enabled": true,
    "interval": "3h",
    "crontab": null,
    "jitter": "20s",
    "timezone_override": null,
    "regular_backup": {
        "enabled": false,
        "max_amount": 0,
        "max_lifetime": "0s",
        "last": -1, "hour": 0, "day": 0, "week": 0, "month": 0, "year": 0
    },
    "temprory_backup": {
        "enabled": true,
        "max_amount": 10,
        "max_lifetime": "30d",
        "last": -1, "hour": 0, "day": 0, "week": 0, "month": 0, "year": 0
    }
}
```

分两类：常规备份（`regular_backup`，默认**不清理**）和临时备份（`temprory_backup`，默认最多留 10 个、最长 30 天）。

每条策略里的字段：

| 字段 | 说明 |
| --- | --- |
| `max_amount` | 最多保留几个，`0` 为不限 |
| `max_lifetime` | 最长保留多久，`"0s"` 为不限 |
| `last` / `hour` / `day` / `week` / `month` / `year` | PBS 风格保留策略，各时间区间内保留几个备份 |

`last` 等区间值：`0` 表示该区间不保留，`-1` 表示保留无限多个。想搞清楚策略效果，可以用 Proxmox 的 [清理模拟器](https://pbs.proxmox.com/docs/prune-simulator/) 试算。

一个「每天留一个、每周留一个、每月留一个，最多留 30 个」的例子：

```json
"regular_backup": {
    "enabled": true,
    "max_amount": 30,
    "max_lifetime": "0s",
    "last": -1, "hour": 0, "day": 7, "week": 4, "month": 6, "year": 0
}
```

清理的决策日志会写在 `pb_files/logs/prune.log` 里，每行都注明了保留还是删除及原因。

### 数据库维护

```json
{
    "compact":      { "enabled": true, "crontab": "0 7 * * 0", "jitter": "1m" },
    "backup":       { "enabled": true, "crontab": "0 6 * * 0", "jitter": "1m", "max_amount": 100 },
    "compact_pack": { "enabled": true, "crontab": "0 5 * * 0", "jitter": "1m" }
}
```

分别是：数据库精简（VACUUM）、数据库备份（存到 `pb_files/db_backup`，最多留 100 份）、打包文件整理。按默认走即可。

### 时间长度与定时写法

时间长度是字符串，如 `"30s"`、`"15m"`、`"12h"`、`"30d"`：

| 单位 | 含义 |
| --- | --- |
| `ms` | 毫秒 |
| `s`, `sec` | 秒 |
| `m`, `min` | 分钟 |
| `h`, `hour` | 小时 |
| `d`, `day` | 天 |
| `mon`, `month` | 月（按 30 天算） |
| `y`, `year` | 年（按 365 天算） |

定时任务二选一：`interval`（间隔模式，如 `"12h"`）或 `crontab`（定时模式，如 `"0 4 * * *"`），不用的那个填 `null`。crontab 可以用 [crontab.guru](https://crontab.guru/) 生成。`jitter` 是随机抖动，避免所有作业撞在一起。

---

## 手把手：几个常见场景

**建一个备份并标记重要节点**

```plaintext
!!pb make 刷怪塔完工
!!pb show ~
!!pb tag ~ protected set true
```

**回档到某个备份**

```plaintext
!!pb list --per-page 20
!!pb back 78
!!pb confirm
```

回错了也没关系，`!!pb list` 里最新的临时备份（带 `T` 标志，注释是「回档至#78前的自动备份」）就是回档前的样子，再 `!!pb back ~` 就能还原。

**清理一批没用的备份**

```plaintext
!!pb list --flags
!!pb tag 50 protected set true     # 先保住要留的
!!pb delete_range 20-45
!!pb confirm
```

**看看备份占了多少空间**

```plaintext
!!pb database overview
```

---

## 常见坑

- 刚装好插件一定要把 `enabled` 改成 `true`，并确认 `targets` 写的是实际存档文件夹名。
- 回档会停服重启，别在服务器正忙的时候做，或者提前在群里说一声。
- `ignore_patterns` 里的文件**回档后会消失**，用之前想清楚；只是不想备份的东西用 `retain_patterns`。
- 保护重要备份用 `!!pb tag <ID> protected set true`，比记着「别删」靠谱。
- 修改配置后要 `!!MCDR plugin reload prime_backup` 才生效。

---

## 参考

- [Prime Backup 中文 Wiki](https://tisunion.github.io/PrimeBackup/zh/)
- [快速上手](https://tisunion.github.io/PrimeBackup/zh/quick_start/)
- [指令](https://tisunion.github.io/PrimeBackup/zh/command/)
- [配置文件](https://tisunion.github.io/PrimeBackup/zh/config/)
- [功能列表](https://tisunion.github.io/PrimeBackup/zh/feature/)
- [概念列表](https://tisunion.github.io/PrimeBackup/zh/concept/)
- [命令行工具](https://tisunion.github.io/PrimeBackup/zh/cli/)
- [GitHub 仓库](https://github.com/TISUnion/PrimeBackup)
- [清理模拟器（PBS）](https://pbs.proxmox.com/docs/prune-simulator/)

