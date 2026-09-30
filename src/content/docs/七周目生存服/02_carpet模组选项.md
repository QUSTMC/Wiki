---
title: carpet模组选项
description: 简介
---
## 所有carpet 相关模组

|名称|mcmod|GitHub|规则说明|
|---|---|---|---|
|Carpet 本体模组|[link](https://www.mcmod.cn/class/2361.html)|[link](https://github.com/gnembon/fabric-carpet)|[link](https://github.com/gnembon/fabric-carpet/wiki/Current-Available-Settings)|
|Carpet 扩展|[link](https://www.mcmod.cn/class/3325.html)|[link](https://github.com/gnembon/carpet-extra)|[link](https://github.com/gnembon/carpet-extra)|
|Carpet TIS Addition|[link](https://www.mcmod.cn/class/5664.html)|[link](https://github.com/TISUnion/Carpet-TIS-Addition)|[link](https://carpet.tis.world/zh-Hans/docs/rules)|
|[GCA]Gugle的Carpet附加包|[link](https://www.mcmod.cn/class/7305.html)|[link](https://github.com/Gu-ZT/gugle-carpet-addition)|[link](https://github.com/Gu-ZT/gugle-carpet-addition)|
|Essential Addons|[link](https://www.mcmod.cn/class/4975.html)|[link](https://github.com/Gu-ZT/gugle-carpet-addition)|[link](https://github.com/Super-Santa/EssentialAddons)|

---

## 七周目开启的配置选项


###  基础设置

#### `language zh_cn`
<font color="blue">`carpet`</font>

默认语言：简体中文

#### `commandLog true`
<font color="blue">`carpet`</font>

允许无权限使用log指令

### 假人相关

#### `commandPlayer true`
<font color="blue">`carpet`</font>

允许无权限使用 `/player` 指令控制/召唤假人

#### `fakePlayerNamePrefix bot_`
<font color="blue">`tis`</font>

为 `/player` 指令召唤出来的假人名称添加指定前缀

#### `openFakePlayerInventory true`
<font color="blue">`gca`</font>

允许玩家打开假人的背包

#### `fakePlayerResident true`
<font color="blue">`gca`</font>

服务器重启后，假人自动加入服务器

#### `fakePlayerAutoReplenishment true`
<font color="blue">`gca`</font>

假人自动补货

体验优化

#### `xpNoCooldown true`
<font color="blue">`carpet`</font>

经验吸收无冷却时间

### 性能优化

#### `optimizedFastEntityMovement true`
<font color="blue">`carpet`</font>

优化快速实体移动，减少实体移动相关的性能开销。

#### `yeetUpdateSuppressionCrash true`
<font color="blue">`tis`</font>

阻止服务端因 StackOverflowError、OutOfMemoryError 或 ClassCastException 异常而造成的服务器崩溃

具体功能实现类似`carpet`的`updateSuppressionCrashFix`规则，但包含更多信息

#### `optimizedHardHitBoxEntityCollision true`
<font color="blue">`carpet`</font>

优化硬碰撞箱实体碰撞检测，减少相关性能开销。