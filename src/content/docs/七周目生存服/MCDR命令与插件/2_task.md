---
title: Task 工程任务展示
description: Task插件及其命令介绍

---
**官方文档：** [GitHub中文文档](https://github.com/TISUnion/Task/blob/master/README_cn.md) ｜ [GitHub](https://github.com/TISUnion/Task)
一个用于统计服务器进行中工程任务的插件


## 用法
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