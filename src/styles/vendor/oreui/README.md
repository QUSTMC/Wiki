# OreUI source and attribution

`colors.css` is copied from [Spectrollay-OreUI/OreUI](https://github.com/Spectrollay-OreUI/OreUI),
`src/components/design/colors/style.css`, at commit
`8ff5dd04ef22881cc1015c3b3faa759382410f35` (retrieved 2026-10-11).
It is distributed under the MIT license; the original file header and LICENSE are retained.

`../../oreui.css` adapts these tokens and the upstream button bevel recipes from
`src/components/controls/button/style.css` to Astro Starlight's existing markup.
The adapter retains native Starlight navigation, search, theme selection, and responsive layout.
Light mode uses the same upstream neutral palette with an adapted contrast mapping.
No OreUI JavaScript, remote fonts, or framework dependency is required.

To update, replace colors.css from a reviewed upstream revision and record its commit here.
To disable the theme, remove `./src/styles/oreui.css` from `customCss` in astro.config.mjs.
