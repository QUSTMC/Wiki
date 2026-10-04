---
title: Scheduled Restart 定时重启
description: Scheduled Restart插件及其命令介绍

---
按 **Linux cron 表达式** 定时重启服务器，并在重启前按你设定的多个时间点，向全服玩家发送**聊天框消息**或**大标题**提醒。

**官方文档：** [GitHub](https://github.com/fangzi2006/MCDR-Scheduled-Restart)

:::note
下文所有命令都以 `!!srestart` 为例（配置里的 `command_alias` 可以改前缀，改成 `!!sr` 后两者完全等价）。

命令在游戏内聊天栏或 MCDR 控制台输入均可，**权限要求不同**，见下面指令表。
:::

## 快速开始

1. 用指令直接建一个计划（立刻生效，不用手改配置文件）：

```
!!srestart add 每日重启 0 4 * * *
```

2. 确认计划生效、看看下次什么时候重启：

```
!!srestart list
```

3. 想先看看提醒在游戏里长什么样，用 `test` 预览（**不会真的重启**）：

```
!!srestart test 1
```

默认配置里的示例计划是关闭的（`enabled: false`），装好插件后**不会自己重启服务器**，需要自己建计划或打开示例计划。

## 指令

根指令 `!!srestart`，`!!srestart help` 查看帮助。

| 指令 | 权限 | 说明 |
| --- | --- | --- |
| `!!srestart list` | 所有玩家 | 所有计划：序号、开关状态、cron、中文描述、下次重启时间与剩余时间、提醒条数 |
| `!!srestart next` | 所有玩家 | 下一次重启的时间与倒计时 |
| `!!srestart status` | helper | 总开关、调度线程、时区、当前计划、配置警告 / 错误 |
| `!!srestart history [条数]` | helper | 最近的重启记录（时间 / 计划 / 方式 / 自动或手动） |
| `!!srestart test <序号\|计划名>` | admin | 按提前量依次发送该计划的提醒，**不会重启**，用于预览 |
| `!!srestart add <计划名> <cron>` | admin | 新建计划：默认启用、使用顶层默认提醒组 |
| `!!srestart remove <序号\|计划名>` | admin | 删除计划 |
| `!!srestart enable [<序号\|计划名>\|all]` | admin | 启用计划并**写入配置文件**（立即生效） |
| `!!srestart disable [<序号\|计划名>\|all]` | admin | 禁用计划并**写入配置文件**（立即生效）；不带参数表示全部 |
| `!!srestart reload` | admin | 重新读取配置文件并重建调度 |
| `!!srestart cancel` | admin | 取消当前待执行的重启（本次不重启，下次照常） |

几个例子：

```
!!srestart list                        # 看序号
!!srestart add 每日重启 0 4 * * *        # 新建：每天 04:00，立刻生效
!!srestart add "每周一 凌晨" 30 3 * * 1   # 名字带空格用引号
!!srestart test 2                      # 预览 2 号计划的提醒（不会重启）
!!srestart disable 2                   # 关掉 2 号计划并写进配置文件
!!srestart enable all                  # 打开全部计划
!!srestart remove 2                    # 删除 2 号计划
```

计划统一用 **序号** 指代（`!!srestart list` 里显示的 `[#1]`、`[#2]`…），也兼容直接写计划名。序号就是配置文件 `schedules` 数组的下标 + 1，即使某条计划写错被跳过也不会错位。序号和计划名都支持 Tab 补全。

:::caution
Minecraft 的 `/op` **不等于** MCDR 的 admin。MCDR 有自己独立的权限系统，默认 Minecraft op 玩家不会自动获得 admin 权限。

想让某个玩家能用变更类指令，在控制台执行：`!!MCDR permission set <玩家名> admin`。
:::

:::tip
想**立刻**重启服务器请用 MCDR 自带的 `!!MCDR server restart`，本插件只负责「按时重启」。
:::

## cron 怎么写

沿用 Linux cron：**5 个字段** `分 时 日 月 周`，也支持 **6 个字段** `秒 分 时 日 月 周`。

| 写法 | 含义 |
| --- | --- |
| `*` / `?` | 任意值 |
| `5` | 具体值 |
| `1-10` | 范围 |
| `1,3,5` | 列表 |
| `*/15` | 步长（每 15 分钟） |
| `1-10/2` | 范围内步长 |
| `JAN`~`DEC` | 月份英文缩写 |
| `SUN`~`SAT` | 星期英文缩写；`0` 与 `7` 都表示周日 |
| `@yearly` / `@monthly` / `@weekly` / `@daily` / `@hourly` / `@minutely` | 常用宏 |

常用示例：

| cron | 含义 |
| --- | --- |
| `0 4 * * *` | 每天 04:00 |
| `30 3 * * 1` | 每周一 03:30 |
| `0 5 1 * *` | 每月 1 日 05:00 |
| `0 0 1 1 *` | 每年 1 月 1 日 00:00 |
| `0 */6 * * *` | 每 6 小时（0、6、12、18 点） |
| `0 4 * * 1,4` | 每周一、周四 04:00 |
| `0 4 1 * 1` | 每月 1 日**或**每周一 04:00（日与周同时限定时取「或」） |
| `30 0 4 * * *` | 6 字段写法：每天 04:00:30 |
| `@daily` | 每天 00:00 |

`!!srestart list` 会把每个表达式翻译成中文（例如「每天 04:00」「每周一 03:30」），方便核对有没有写错。

## 配置文件

文件路径 `config/scheduled_restart/config.json`，改完执行 `!!srestart reload` 生效。用 `add` / `enable` / `disable` 指令改的东西会直接写进这个文件。

### 顶层字段

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | bool | `true` | 插件总开关，`false` 时完全不调度 |
| `timezone` | string / null | `null` | 时区，如 `"Asia/Shanghai"`；`null` 表示跟随 MCDR 进程的本地时区 |
| `check_interval_seconds` | number | `1.0` | 调度线程轮询间隔（秒），一般不用改 |
| `skip_missed_notifications` | bool | `true` | 计划生成时已经过期的提醒是否跳过 |
| `notify_on_join` | bool | `true` | 玩家进服时是否私聊告知重启倒计时 |
| `join_message` | string | 见示例 | 进服私聊内容，支持占位符 |
| `log_history` | bool | `true` | 是否把每次重启写入 `history.jsonl` |
| `history_size` | int | `100` | 历史文件过大时保留的最近条数 |
| `command_alias` | string | `""` | 自定义简化指令前缀，如 `"!!sr"`；留空则只保留 `!!srestart` |
| `default_notifications` | array | 1 条示例 | **默认提醒组**，计划里 `use_default_notifications: true` 时使用 |
| `schedules` | array | 示例 | 重启计划列表 |

### `schedules[]`（计划）

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | string | `计划N` | 计划名，指令里也可以用序号代替；重名会自动加 `#2` |
| `enabled` | bool | `true` | 该计划是否启用 |
| `cron` | string | 必填 | cron 表达式 |
| `restart_method` | string | `mcdr_restart` | `mcdr_restart` / `stop` / `stop_exit` / `custom` / `none` |
| `custom_command` | string | `stop` | `restart_method=custom` 时下发的服务端指令 |
| `custom_auto_start` | bool | `false` | `custom` 模式下，等服务器停止后是否自动启动 |
| `restart_delay_seconds` | number | `0` | 到点后再延迟多少秒真正重启（支持 `"30s"`、`"1m"` 写法）；**提醒以真正重启的时刻为基准** |
| `kick_players` | bool | `false` | 重启前是否先 `kick @a` 踢人（1.20.3+ 才支持 `@a` 选择器） |
| `kick_message` | string | 见示例 | 踢人提示语 |
| `use_default_notifications` | bool | `true` | `true` 用顶层 `default_notifications`；`false` 用本计划的 `notifications` |
| `notifications` | array | `[]` | 本计划专属提醒；写了这个数组但没写 `use_default_notifications` 时自动视为 `false` |

`restart_method` 怎么选：

- `mcdr_restart`：调用 MCDR 的 `server.restart()`（软停服 → 等待 → 重新启动），MCDR 进程保持运行
- `stop`：只下发停服指令，MCDR 继续运行（适合自己有用进程守护 / 编排重启的场景）
- `stop_exit`：停服后让 MCDR 一起退出（适合交给 systemd 等守护进程拉起）
- `custom`：执行 `custom_command`，可选 `custom_auto_start`
- `none`：只发提醒不重启（可用于「提前预告维护」）

### `notifications[]`（提醒）

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | bool | `true` | 是否启用这条提醒 |
| `advance_time` | number / string | `60` | 提前多久发送；支持秒数，也支持 `"5m"`、`"1h30m"`、`"1天2小时"` |
| `type` | string | `chat` | `chat`（聊天框）/ `title`（大标题）/ `actionbar` / `command` |
| `message` | string | `""` | `chat` / `actionbar` 的文本 |
| `title` | string | `""` | `title` 的主标题 |
| `subtitle` | string | `""` | `title` 的副标题 |
| `times` | object | `{"fade_in":1,"stay":4,"fade_out":1}` | 大标题的淡入 / 停留 / 淡出时间，单位秒 |
| `color` | string / null | `null` | 颜色名（`yellow`、`red`、`gold`…）或 `#RRGGBB`；也可以直接写在文本里用 `§e` |
| `sound` | string / null | `null` | 音效 ID，如 `minecraft:block.note_block.pling` |
| `sound_source` | string | `master` | 音效频道；老版本（1.8~1.12）服务端可设为 `""` |
| `sound_position` | string | `"@s"` | 音效播放位置，见下方说明 |
| `sound_volume` / `sound_pitch` | number | `1.0` | 音量 / 音调（`sound_position` 为空时会被忽略） |
| `command` | string | `""` | `type=command` 时下发的指令，支持占位符 |

一个「多条提醒」的完整例子：

```json
{
  "name": "每天凌晨4点重启",
  "enabled": true,
  "cron": "0 4 * * *",
  "restart_method": "mcdr_restart",
  "use_default_notifications": false,
  "notifications": [
    { "advance_time": "30m", "type": "chat",  "message": "§e[维护] §f服务器将在 §b{remaining} §f后重启（§b{time}§f）" },
    { "advance_time": "10m", "type": "title", "title": "§e重启倒计时", "subtitle": "§f剩余 §b{remaining}",
      "times": { "fade_in": 0.5, "stay": 3, "fade_out": 0.5 },
      "sound": "minecraft:block.note_block.pling" },
    { "advance_time": 60, "type": "actionbar", "message": "§c60 秒后重启" },
    { "advance_time": 10, "type": "title", "title": "§c马上重启！", "subtitle": "§f快找地方下线" },
    { "advance_time": 0,  "type": "chat",  "message": "§c[维护] §f服务器正在重启，请稍后重新连接" }
  ]
}
```

提醒条数不限，**用「数组里放对象」的写法**，每条提醒自由设置提前时间与通知方式。

### 占位符

写在 `message` / `title` / `subtitle` / `command` / `join_message` 里，发送时替换：

| 占位符 | 含义 | 示例 |
| --- | --- | --- |
| `{remaining}` | 中文剩余时长 | `5分`、`1小时2分3秒` |
| `{remaining_seconds}` | 剩余秒数（整数） | `300` |
| `{remaining_minutes}` | 剩余分钟数（向上取整） | `5` |
| `{time}` | 重启时刻 | `04:00:00` |
| `{date}` | 重启日期 | `2026-07-22` |
| `{datetime}` | 完整时刻 | `2026-07-22 04:00:00` |
| `{schedule}` | 计划名 | `每天凌晨4点重启` |
| `{cron}` | cron 表达式 | `0 4 * * *` |
| `{index}` / `{total}` | 这是第几条提醒 / 共几条 | `2` / `5` |

## 常见问题

**配置写错了会怎样？**

- 单个字段类型写错 → 使用默认值并记一条警告，插件照常运行（会顺手把规范化后的配置写回文件）
- 整个计划的 `cron` 写错 → 只跳过该计划，记一条错误，**不写回文件**（保留你写的内容方便修正）
- 用 `!!srestart status` 或看控制台日志都能看到这些警告 / 错误

**`enable` / `disable` 是只对本次运行生效吗？**

不是，它**改配置文件**（持久），直接写 `schedules[i].enabled` 并立刻热重载生效。所以配置文件里本来就是关闭的计划也能用 `!!srestart enable <序号>` 打开；配置文件里其它内容（你自己加的字段等）不会被动。

**重载或重启后，过去的提醒会补发吗？**

默认不会（`skip_missed_notifications: true`）。例如 3:59 才启动插件而计划 4:00 重启，5 分钟和 1 分钟的提醒会被标记为「已过期」跳过，只发还来得及的那几条；设为 `false` 则会立刻补发。

**服务器没在运行时，提醒会怎样？**

会跳过并记一条警告（`服务器当前未运行，跳过提醒`）。计划本身会保留，等服务器起来后照常执行。重启动作同理——服务器没运行时会跳过，而不是假装执行成功。

**`kick_players` 没生效？**

`kick @a` 需要 Minecraft 1.20.3+；老版本请保持 `false`，让服务器关服时自然踢人，或用 `type: "command"` 的提醒自己下发指令。

**Windows 上 `timezone` 无效？**

Windows 自带的时区数据库 Python 读不到，需要 `pip install tzdata` 才能使用 `"Asia/Shanghai"` 这类名字；没装时会打印一条警告并自动回退到跟随 MCDR 进程的本地时区。

**配了 `sound` 却听不到声音 / 报坐标错误？**

Java 的 `playsound` 语法里**坐标排在音量前面**：想自定义音量 / 音调就必须先给坐标，否则 `… @a 1 1` 里的 `1 1` 会被当成坐标（坐标需要 x y z 三个分量）而报错。

插件默认 `"sound_position": "@s"` 生成的是：

```
execute as @a at @s run playsound <音效> master @s ~ ~ ~ <音量> <音调>
```

也就是每个玩家在自己位置听到（1.13+）。想让音效锚定固定位置就把 `sound_position` 写成坐标文本；服务端是 1.12 及更早（没有 `execute as/at`）时，用 `"sound_position": "~ ~ ~"` + `"sound_source": ""`。

**能同时配多条计划吗？**

可以。调度器每次只执行「最近的一次」重启，避免两个计划挨得太近互相打架；被取消的那一次不会再触发。

**插件的日志在哪里看？**

打在 MCDR 控制台（前缀 `[scheduled_restart]`）。插件另外把每次重启写进 `config/scheduled_restart/history.jsonl`，可用 `!!srestart history` 查看。
