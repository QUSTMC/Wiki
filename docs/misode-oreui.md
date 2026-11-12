# Misode 的 OreUI 主题

本站主题覆盖层保存在 `src/styles/misode/oreui.css`，共用 `src/styles/vendor/oreui/colors.css` 的 OreUI 配色和许可，使用本站 Fusion Pixel 字体。浅色和深色分别跟随 Misode 原有的主题菜单，保留代码编辑器的等宽字体及语法颜色。

`scripts/misode-theme.mjs` 将共享色板与覆盖层合成 CSS，在 Misode 打包完成后向所有生成的 HTML（包含生成器深层入口）注入一个最后加载的样式链接。CSS URL 带内容指纹，主题变更后浏览器会重新获取。`scripts/build-misode.mjs` 即使命中上游打包缓存也会重新应用覆盖层，因此修改主题不需要重新编译上游应用。

这些文件全部位于 `vendor/misode` 之外。Misode 更新脚本仅三方合并 vendor 下的上游文件，更新 PR 也只包含 vendor 和上游版本记录，因此不会覆盖本站的主题覆盖层。主题不通过修改上游 CSS 或 Preact 组件来实现。

上游若改变 CSS 变量或组件类名，覆盖层仍会保留，但相关视觉适配可能需要维护。`tests/misode-theme.test.mjs` 验证每个入口注入、重复应用和上游产物覆盖后的重注入；`tests/misode-browser.test.mjs` 验证深浅主题、导航、下拉菜单、编辑器输出和移动端布局。上游更新工作流会在创建 PR 前运行这些检查。

修改样式后运行 `npm run build`，或运行 `node scripts/build-misode.mjs` 重新应用主题。开发服务器使用项目规定的后台模式启动。

默认语言也在本站注入层中设置：应用启动前，若没有保存过 `language`，初始化为 `zh-cn`（简体中文）；已有的手动选择保持不变。无需修改上游 Store 或现有翻译文件，后续可以单独补齐中文翻译。
