# 隐藏页面使用说明

放入 `.md`、`.mdx`、`.html`、`.astro` 文件，构建时自动生成 `/s/` 下的页面。保留目录层级和大小写，中文、空格、`#`、`%` 等字符按路径段编码。

| 文件 | 地址 |
| --- | --- |
| `index.md` | `/s/` |
| `hello.md` | `/s/hello/` |
| `notes/index.md` | `/s/notes/` |
| `notes/private.md` | `/s/notes/private/` |

以下划线或点开头的文件、目录忽略，包括本说明文件。其他扩展名、符号链接也忽略；扩展名使用小写。源目录缺失或为空时构建可通过。

Markdown/MDX 可通过 frontmatter 设置 `title`，省略时使用文件名。使用独立内容集合缓存，套用 Starlight 布局，隐藏侧边栏、目录、前后页导航，不加入正常文档导航与 Pagefind 搜索，自动添加 `noindex, nofollow`。

HTML 原文输出，Astro 直接渲染组件；自行提供页面结构、标题及 robots 元标签。`public/robots.txt` 已禁止抓取 `/s/`。

重复地址会阻止构建，例如 `hello.md` 与 `hello.mdx`、`notes.md` 与 `notes/index.md`。正常文档使用 Starlight 集合最终 ID 检查，支持 frontmatter `slug`：隐藏 `hello.md` 与普通 `src/content/docs/s/hello.md` 或设置 `slug: s/hello` 的文档冲突；普通 `/hello/` 与隐藏 `/s/hello/` 可共存。错误包含地址、双方源文件及修复建议。

隐藏页面仍可被知道 URL 的人访问，没有身份验证；不要存放密码、令牌或私人数据。爬虫自行决定是否遵守 robots 规则。

测试：`node --test src/lib/secret-pages.test.mjs`；构建：`npm run build`。按项目约定用 `astro dev --background` 启动，使用 `astro dev status`、`astro dev logs`、`astro dev stop` 管理。
