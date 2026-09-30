---
title: MCDR插件
description: mcdr插件及其命令介绍
---
## Where2go 坐标点共享与位置查询
可以将路径点共享到服务器，也可以查询玩家的位置
### 更”智能“的查询

聊天发送`XXX在哪`即可快速查询坐标点`XXX`或玩家`XXX`的位置

### 服务器共享坐标点
<mark><small>这里的坐标点是存在服务器中的，所有人可查看，用于共享某个重要地点或者机器</small></mark>

`!!wp add <xaero-waypoint>` 添加Xaero坐标点

在Xaero地图中分享坐标点后，插件可**自动识别**。点击临时坐标点后方的`[+]`即可添加。若两个坐标点距离过近，插件会进行提示，以防重复添加。

`!!wp addpos <x> <y> <z> <dimension> <name>`

添加名为`name`，坐标为`(x, y, z)`，位于`dimension`维度的坐标点。对于原版维度，`dimension`可以为`overworld` `the_nether` `the_end`或分别简写为`o` `n` `e`

`!!wp addhere <name>` 将玩家当前位置添加为名为`name`的坐标点

`!!wp remove <id>` 移除坐标点

`!!wp link <id> <target_id>` 建立两个坐标点之间的连接。例如连接下界传送门的两侧，或末地折跃门的两端。连接后查询坐标点时会自动显示对应维度的链接目标

`!!wp unlink <id>` 解除坐标点的连接

`!!wp autolink [page]` 自动为未连接的坐标点寻找合适的连接目标

`!!wp list [page]` 列出所有的坐标点。`page`为可选项，不填则默认为`1`

`!!wp search <name>` 按照坐标点名称`name`搜索坐标点

`!!wp info <id>` 查看id为`id`的坐标点详情

### 更先进的!!here与!!vris

`!!here` 广播自身位置。若100m内有坐标点，则同时提示"附近的坐标点"

`!!vris <player>` 查询玩家`player`位置。若该玩家100m内有坐标点，则同时提示"附近的坐标点"

此功能用于快速辨别玩家位置，如玩家位于全物品附近。同时在部分情况下可以快速找到该玩家附近的地狱门

### 演示

![](../../../assets/mcdr/show.jpg)

### 配置文件

#### xaero

**click_event_format** `str`, `list`

- 添加Xaero坐标点的按钮格式。可选：
    - `"old"`：样式为金色的`[+X]`，支持 Xaero's Minimap v24.x及以下版本。
    - `"new"`：样式为黄色的`[+X]`，支持 Xaero's Minimap v25.x及以上的版本。
    - 列表格式，如`["old", "new"]`，样式为`[+X]（金色） [+X]（黄色）`，点击前一个按钮可以使旧版Xaero添加坐标点，点击后一个按钮可以使新版Xaero添加坐标点。
- **[注意]**：~~客户端请务必安装[LetMeClickAndSend](https://modrinth.com/mod/let-me-click-and-send)模组~~
- 本服务器已经安装`LetMeClickAndSendforServer`，客户端无需安装，但是这个mod会使得最大聊天消息长度减少7

#### command

**waypoints** `str`

- 坐标点相关指令的指令前缀

**whereis** `str`

- 查询玩家位置的指令前缀

**here** `str`

- 发送自身位置的指令

**fastsearch_regex** `str`

- 快速询问的正则匹配。如果你想要支持英文，可以改成像这样：`[wW]here ((is)|(are)|(r)) (?P<name>\w+)\??`

**fastsearch_prompt** `str`

- 快速询问在MCDR的`!!help`界面显示的命令帮助

## Task 工程任务展示
一个用于统计服务器进行中工程任务的插件


### 用法
`!!task help` 显示帮助信息

`!!task overview` 显示任务概览(同时也是!!task命令的默认行为)

`!!task list` 显示任务列表

`!!task detail` <任务名称> 查看任务详细信息

`!!task list-all` 显示所有任务和它们的子任务

`!!task add <任务名称> [任务描述]` 添加任务

`!!task remove/rm/delete/rm` <任务名称]> 删除任务

`!!task rename <旧任务名称> <新任务名称>` 重命名任务

`!!task change <任务名称> <新任务描述>` 修改任务描述

`!!task done <任务名称>` 标注任务为已完成

`!!task undone <任务名称>` 标注任务为未完成

`!!task deadline <任务名称> <工期:日数>/clear` 为任务设置工期或者清除工期

`!!task player <任务名称>` 查阅玩家任务列表

`!!task res[ponsible] <任务名称> <玩家>` 设置任务的责任人

`!!task unres[ponsible] <任务名称> <玩家>/-all` 移除任务的责任人或者移除所有责任人

注: 上述所有 [任务名称] 可以用 [任务名称].[子任务名称] 的形式来访问子任务

例: !!task add 女巫塔.铺地板 挂机铺黑色玻璃

## Gamemode 旁观 / 生存切换

### 使用

`!!spec` 切换旁观/生存

`!!spec <player>` 切换他人模式

`!!tp <player>` 传送至指定玩家

`!!tp <dimension>` 传送至指定维度（主世界与下界自动换算坐标）

`!!tp [dimension] <x> <y> <z>` 传送至（指定维度的）指定坐标

`!!back` 返回上个地点

可使用配置的短命令`!s`替代 `!!spec`

### 配置

默认配置如下:

```json
{
    "version": 2,
    "data_path": null,
    "short_commands": [
        "!s"
    ],
    "permissions": {
        "spec": 1,
        "spec_other": 2,
        "tp": 1,
        "back": 1
    },
    "range_limit": {
        "check_interval": 0,
        "x": 50,
        "y": 50,
        "z": 50
    }
}
```

#### version

配置文件版本，请不要更改

#### data_path

默认值: `null`

用于设置存储正处于旁观模式的玩家的信息（如: 他们生存切旁观时的位置）等数据的文件的位置，默认（`null`）存储于插件配置文件夹中。

如果你同时安装了其他备份插件（如 Prime Backup），则建议将此项设置为存档内的文件，防止回档后玩家的 "旁观" 没有回档，例如 `server/world/mcdr-plugin-config/gamemode/data.json`。

#### permissions

各种操作所需的最低权限

##### spec

默认值: `1`

使用 `!!spec` 与 `short_command` (若启用) 的最低权限

##### spec_other

默认值: `2`

使用 `!!spec <player>` 的最低权限

##### tp

默认值: `1`

使用 `!!tp <player>`、`!!tp <dimension>`、`!!tp [dimension] <x> <y> <z>` 的最低权限

##### back

默认值: `1`

使用 `!!back` 的最低权限

#### short_commands

默认值: `["!s"]`

短命令列表，`!!spec` 的别名，运行此命令的权限要求与 `!!spec` 相同。

#### range_limit

活动范围限制（切旁观时限制活动范围在一个长方体内），超过限制范围将自动传回到最近的边界，仅对无 tp 权限的玩家生效。

##### check_interval

默认值: `0`

检查间隔（秒），`0` 表示禁用活动范围限制，推荐不大于 `5`

##### x

默认值: `50`

x 方向活动半径，`0` 代表不限制此方向上的活动范围

##### y

默认值: `50`

y 方向活动半径，`0` 代表不限制此方向上的活动范围

##### z

默认值: `50`

z 方向活动半径，`0` 代表不限制此方向上的活动范围