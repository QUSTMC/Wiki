---
title: MCDR命令
description: mcdr常用指令
---
> 适用于 MCDReforged 2.x。

> 本文根据 MCDReforged 官方文档的 `!!MCDR` 命令页面整理，主要收录服务器管理员日常最常用的基础命令；插件仓库高级操作和 Debug 命令暂不列入。

> 官方文档：https://docs.mcdreforged.com/zh-cn/latest/command/mcdr.html

## 1. 基本说明

MCDR 的管理命令统一使用：

```text
!!MCDR
```

`!!MCDR` 可以在：`MCDR 控制台`、`Minecraft 游戏聊天框`中执行。

### 权限

大多数 `!!MCDR` 管理命令需要 **权限等级 3（admin）**。

权限等级 1（user）执行 `!!MCDR` 时，只会显示 MCDR 版本。

权限等级 4（owner）可以额外查看部分高级状态信息，例如服务端 PID 和信息处理队列负载。

---

## 2. 日常管理推荐

对于普通服务器管理，通常最常用的是：

```text
!!MCDR status
```

查看状态。

```text
!!MCDR reload plugin
```

修改插件后重载发生变化的插件。

```text
!!MCDR reload config
```

修改 MCDR 配置后重新读取配置。

```text
!!MCDR plg list
```

查看当前插件。

```text
!!MCDR plg reload <plugin_id>
```

单独重载某个插件。

```text
!!MCDR server restart
```

重启 Minecraft 服务端。

```text
!!MCDR server stop
```

安全停止 Minecraft 服务端，但保持 MCDR 运行。

---

### 权限等级速记

| 等级 | 名称 | 说明 |
|---:|---|---|
| 0 | guest | 最低权限 |
| 1 | user | 普通用户 |
| 2 | helper | 协助管理 |
| 3 | admin | 管理员 |
| 4 | owner | 所有者 |

> 具体命令是否可用仍以 MCDR 当前权限配置为准。

### 注意事项

#### `reload` 与 `server restart` 不同

```text
!!MCDR reload plugin
```

是重新加载 MCDR 插件，并不会重启 Minecraft 服务端。

```text
!!MCDR server restart
```

才是重启 Minecraft 服务端。

#### `disable` 与 `unload` 不同

```text
!!MCDR plg unload <plugin_id>
```

只是从当前 MCDR 运行环境中卸载插件。

```text
!!MCDR plg disable <plugin_id>
```

会将插件置于禁用状态，使其不再作为正常启用插件加载。

#### `stop` 与 `stop_exit` 不同

```text
!!MCDR server stop
```

只停止 Minecraft 服务端。

```text
!!MCDR server stop_exit
```

同时停止 Minecraft 服务端并退出 MCDR。

---

## 3. 常用命令速查

| 命令 | 作用 |
|---|---|
| `!!MCDR` | 显示 MCDR 帮助 / 版本 |
| `!!MCDR status` | 查看 MCDR 和服务端状态 |
| `!!MCDR reload` | 查看重载帮助 |
| `!!MCDR reload plugin` | 重载发生变化的插件 |
| `!!MCDR reload config` | 重载 MCDR 配置 |
| `!!MCDR reload permission` | 重载权限 |
| `!!MCDR reload all` | 全部重载 |
| `!!MCDR perm list` | 查看玩家权限 |
| `!!MCDR perm set <玩家> <等级>` | 设置玩家权限 |
| `!!MCDR perm q <玩家>` | 查询玩家权限 |
| `!!MCDR perm remove <玩家>` | 删除玩家权限记录 |
| `!!MCDR plg list` | 查看插件列表 |
| `!!MCDR plg info <ID>` | 查看插件信息 |
| `!!MCDR plg reload <ID>` | 重载插件 |
| `!!MCDR plg enable <文件>` | 启用插件 |
| `!!MCDR plg disable <ID>` | 禁用插件 |
| `!!MCDR plg unload <ID>` | 卸载插件 |
| `!!MCDR plg reloadall` | 重载所有未禁用插件 |
| `!!MCDR pref list` | 查看偏好设置 |
| `!!MCDR pref <名称> set <值>` | 设置偏好 |
| `!!MCDR pref <名称> reset` | 重置偏好 |
| `!!MCDR checkupdate` | 检查 MCDR 更新 |
| `!!MCDR server start` | 启动服务器 |
| `!!MCDR server stop` | 停止服务器，不退出 MCDR |
| `!!MCDR server stop_exit` | 停止服务器并退出 MCDR |
| `!!MCDR server restart` | 重启服务器 |
| `!!MCDR server kill` | 强制结束服务器及子进程 |

---

## 4. 查看状态

```text
!!MCDR status
```

该命令将返回 MCDR 的当前状态。主要可以查看：
- MCDR 版本
- MCDR 当前状态
- Minecraft 服务端状态
- 服务端是否已经启动
- 服务端是否会在停止后退出 MCDR
- RCON 连接状态
- 当前加载的插件数量

Owner 权限还可以查看：
- 服务端 PID
- PID 进程树
- MCDR 信息处理队列负载

这是日常检查 MCDR 是否正常运行时最常用的命令之一。

---

## 5. 热重载 MCDR

`!!MCDR reload`子命令可以热重载 MCDR。

显示重载相关帮助：

```text
!!MCDR reload
```

缩写：

```text
!!MCDR r
```

### 重载插件

只重载有变化的插件：

```text
!!MCDR reload plugin
```

缩写：

```text
!!MCDR r plg
```

适用于修改了插件文件后，让 MCDR 重新读取插件。

### 重载配置


重新读取 MCDR 配置文件：


```text
!!MCDR reload config
```

缩写：

```text
!!MCDR r cfg
```

### 重载权限

重新读取权限文件：

```text
!!MCDR reload permission
```

缩写：

```text
!!MCDR r perm
```

### 全部重载

一次重载插件、配置和权限：

```text
!!MCDR reload all
```

缩写：

```text
!!MCDR r all
```

---

## 6. 权限管理

权限管理命令：

```text
!!MCDR permission
```

缩写：

```text
!!MCDR perm
```

直接执行可以查看权限管理帮助。

### 查看所有玩家权限

```text
!!MCDR perm list
```

指定等级：

```text
!!MCDR perm list 4
```

例如：

```text
!!MCDR perm list 4
```

表示只列出权限等级为 4（owner）的玩家。

### 设置玩家权限

```text
!!MCDR perm set <玩家名> <等级>
```

例如：

```text
!!MCDR perm set Steve admin
```

将 Steve 设置为权限等级 3（admin）。

也可以直接使用数字：

```text
!!MCDR perm set Steve 3
```

### 查询权限

查询指定玩家：

```text
!!MCDR perm query <玩家名>
```

也可以使用缩写：

```text
!!MCDR perm q <玩家名>
```

例如：

```text
!!MCDR perm q Steve
```

不指定玩家时：

```text
!!MCDR perm q
```

查询当前命令执行者自己的权限等级。

### 删除玩家权限记录

```text
!!MCDR perm remove <玩家名>
```

例如：

```text
!!MCDR perm remove Steve
```

这会从 MCDR 权限数据库中删除 Steve 的权限记录。

### 设置默认权限等级

```text
!!MCDR perm setdefault <等级>
```

缩写：

```text
!!MCDR perm setd <等级>
```

例如：

```text
!!MCDR perm setd 1
```

将默认权限设置为等级 1。

---

## 7. 插件管理

插件管理命令：

```text
!!MCDR plugin
```

缩写：
```text
!!MCDR plg
```

---

### 查看已安装插件

```text
!!MCDR plg list
```

列出当前已安装的插件。

---

### 查看插件信息

```text
!!MCDR plg info <plugin_id>
```

例如：

```text
!!MCDR plg info my_plugin
```

用于查看指定插件的信息。

---

### 加载插件

```text
!!MCDR plg load <文件名>
```

例如：

```text
!!MCDR plg load my_plugin.py
```

主要用于当前尚未加载的插件文件。

---

### 启用插件

```text
!!MCDR plg enable <文件名>
```

例如：

```text
!!MCDR plg enable my_plugin.py.disabled
```

用于启用被禁用的插件。

---

### 重载插件

```text
!!MCDR plg reload <plugin_id>
```

例如：

```text
!!MCDR plg reload my_plugin
```

适合修改插件配置或代码后重新加载插件。

---

### 卸载插件

```text
!!MCDR plg unload <plugin_id>
```

例如：

```text
!!MCDR plg unload my_plugin
```

只卸载插件，不等同于删除插件文件。

---

### 禁用插件

```text
!!MCDR plg disable <plugin_id>
```

例如：

```text
!!MCDR plg disable my_plugin
```

用于禁用指定插件。

---

### 重载所有插件

```text
!!MCDR plg reloadall
```

缩写：

```text
!!MCDR plg ra
```

加载、重载或卸载所有当前未禁用的插件，使插件状态与插件目录保持一致。

---

## 8. 偏好设置

偏好设置命令：

```text
!!MCDR preference
```

缩写：

```text
!!MCDR pref
```

与大多数 MCDR 管理命令不同，偏好设置只需要权限等级 **1（user）**。

### 查看偏好列表

```text
!!MCDR pref list
```

查看当前可用的偏好设置。

### 查看某项偏好

```text
!!MCDR pref <偏好名称>
```

例如：

```text
!!MCDR pref language
```

### 设置偏好

```text
!!MCDR pref <偏好名称> set <值>
```

例如：

```text
!!MCDR pref language set zh_cn
```

将语言偏好设置为 `zh_cn`。

### 重置偏好

```text
!!MCDR pref <偏好名称> reset
```

例如：

```text
!!MCDR pref language reset
```

恢复该偏好为默认值。

---

## 9. 检查 MCDR 更新

```text
!!MCDR checkupdate
```

缩写：

```text
!!MCDR cu
```

用于手动检查 MCDR 是否存在 GitHub 新版本。

---

## 10. 服务端控制

服务端控制命令：

```text
!!MCDR server
```

用于控制由 MCDR 守护的 Minecraft 服务端。

### 启动服务器

```text
!!MCDR server start
```

启动 Minecraft 服务端。

### 停止服务器

```text
!!MCDR server stop
```

停止 Minecraft 服务端，但 **MCDR 本身继续运行**。

适合需要停服但不关闭 MCDR 的情况。

### 停服并退出 MCDR

```text
!!MCDR server stop_exit
```

停止 Minecraft 服务端，同时退出 MCDR。

### 退出 MCDR

```text
!!MCDR server exit
```

退出 MCDR。

执行前应确保 Minecraft 服务端已经关闭。

### 重启服务器

```text
!!MCDR server restart
```

重启 Minecraft 服务端。

### 强制结束服务器

```text
!!MCDR server kill
```

强制杀死 Minecraft 服务端及其所有子进程。

> 该命令属于强制操作，正常停服时优先使用 `!!MCDR server stop`。

---

## 参考

- MCDReforged 官方文档：  

  https://docs.mcdreforged.com/zh-cn/latest/command/mcdr.html

- 当前文档版本：MCDReforged 2.15.7