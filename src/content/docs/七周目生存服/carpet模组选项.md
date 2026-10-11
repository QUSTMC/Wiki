---
title: carpet模组选项
description: 简介
---
## 所有carpet 相关模组

|名称|MC百科|GitHub|规则说明|本服是否装载|
|---|:---:|:---:|:---:|:---:|
|Carpet 本体模组|[link](https://www.mcmod.cn/class/2361.html)|[link](https://github.com/gnembon/fabric-carpet)|[link](https://github.com/gnembon/fabric-carpet/wiki/Current-Available-Settings)|✅|
|Carpet 扩展|[link](https://www.mcmod.cn/class/3325.html)|[link](https://github.com/gnembon/carpet-extra)|[link](https://github.com/gnembon/carpet-extra)|❌|
|Carpet TIS Addition|[link](https://www.mcmod.cn/class/5664.html)|[link](https://github.com/TISUnion/Carpet-TIS-Addition)|[link](https://carpet.tis.world/zh-Hans/docs/rules)|✅|
|[GCA]Gugle的Carpet附加包|[link](https://www.mcmod.cn/class/7305.html)|[link](https://github.com/Gu-ZT/gugle-carpet-addition)|[link](https://github.com/Gu-ZT/gugle-carpet-addition)|✅|
|[ROF]Carpet Rof Addition|[link](https://www.mcmod.cn/class/27271.html)|[link](https://github.com/Melationin/ROF-Carpet-Addition)|[link](https://github.com/Melationin/ROF-Carpet-Addition/blob/MCP/docs/zh_cn/rules.md)|✅|
|[DDS]Carpet DDS Addition|[link](https://www.mcmod.cn/class/29799.html)|[link](https://github.com/x-oOvOo-x/Carpet-DDS-Addition)|[link](https://github.com/x-oOvOo-x/Carpet-DDS-Addition/blob/main/docs/rules-zh_cn.md)|❌|
|Essential Addons|[link](https://www.mcmod.cn/class/4975.html)|[link](https://github.com/Gu-ZT/gugle-carpet-addition)|[link](https://github.com/Super-Santa/EssentialAddons)|❌|

---

## 七周目开启的配置选项


###  基础设置

#### `language zh_cn`
<font color="blue">`carpet`</font>

默认语言：简体中文

#### `commandLog true`
<font color="blue">`carpet`</font>

允许无权限使用log指令

---

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

---

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

#### `asyncNaturalSpawning true`

<font color="blue">`rof`</font>

异步预计算自然生成候选；实体创建和数量统计仍在主线程执行。

数据不可用或结果过期时自动回退原版。

#### `piglinStackingAISuppression 50`

<font color="blue">`rof`</font>

对于堆叠到一定量的猪灵，抑制其中部分猪灵的ai。

#### `optimizedExplosion 4`

<font color="blue">`rof`</font>

同一游戏刻内同一点的连续爆炸达到该次数后，先按最坏情况判断这次爆炸是否可能破坏方块；只有不可能破坏方块时才跳过方块计算，只影响实体。

设置为 0 或负数表示禁用。只对同一游戏刻内、坐标与威力完全相同的连续爆炸生效。

#### `mergeExplosion true`

<font color="blue">`rof`</font>

把合并TNT产生的多次爆炸合成一次，只对实体作用一次。仅在合并TNT和爆炸优化已启用时生效。

需要 `mergeTNTNext` 处于非 False 模式。伤害只结算一次；推力按合并次数补齐，总推力与原版一致。

#### `asyncRandomTick true`

<font color="blue">`rof`</font>

异步预计算下一游戏刻的随机刻候选；结果失效时自动回退原版。

#### `mergeTNTNext SafePlus`

<font color="blue">`rof`</font>

更为激进的tnt合并方案，可能会导致预期之外的结果。不能与其他tnt合并一起开。

- `False`：关闭合并
- `TRUE`：旧版的爆炸处理方案，会使移动中的合并tnt发生不原版的行为
- `SAFE`：更安全的爆炸处理方案，让移动中的合并tnt行为与原版一致
- `AlmostVanilla`：更接近原版的tnt合并方案，只在tnt爆炸时合并，并且保tnt tick顺序
- `SafePlus`：与 AlmostVanilla 一样只在tnt爆炸时合并，但合并判定放在每tick一次的提前遍历里，只合并遍历中相邻的同点位tnt，且不改写实体tick顺序

理论上，AlmostVanilla 模式不会改变 TNT 行为，因此在纯原版中不应发现相关差异。