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

## Supplemental library

The primary theme remains Spectrollay-OreUI/OreUI.
`oreui-web@0.1.0-beta.1` from https://github.com/katorlys/OreUI is retained
as a supplemental dependency for gradual, component-specific adoption. Only the Progress Bar CSS is currently used, extracted unchanged from the installed
package into `progress-bar.css`; its MPL-2.0 license is retained in
`LICENSE-katorlys`. The complete library stylesheet is not loaded. Do not replace
the primary palette or tutorial skin when introducing supplemental components.
This second library uses MPL-2.0; its license is included in the installed
`oreui-web` package. Keep its attribution separate from the MIT primary theme.

The loading overlay in `src/components/PageLoading.astro` uses the upstream native
`progress.ore-progress-bar` and `.ore-progress-bar-label` markup. Wiki additions
are limited to overlay layout, the user-supplied Minecrafter title font, and page
loading lifecycle behavior. Progress is an estimated activity animation with no
percentage label, completing on window load. The primary MIT theme is unchanged.

First-entry loading uses an opaque backdrop with a 240ms exit fade. Internal
navigation uses a 65% opaque backdrop with a 180ms entrance and 240ms exit fade;
foreground colors remain opaque. A one-use sessionStorage destination marker
keeps the navigation mode across full document loads. Reduced-motion users skip
these fades and the navigation delay. These are wrapper behaviors; the upstream
Progress Bar CSS remains unchanged.

The LOADING label reserves its layout space while `document.fonts.load()` prepares
the Minecrafter font in each document. Only then is the label revealed, preventing
a fallback-font flash even when the HTTP cache needs revalidation. A failed font
request uses a fallback and does not block the loading overlay from finishing.

Full document navigation is retained. Where cross-document View Transitions and
ViewTransition.waitUntil are available, a head opt-in and loader snapshot keep the
outgoing loader visible until the incoming font is ready. The old backdrop/label snapshot and the live incoming progress image then
fade together for 240ms. Progress has a separate transition name so it keeps updating and reaches 100 before the fade, rather than freezing inside the old snapshot. Other browsers and reduced-motion users retain the
existing loading behavior. This enhancement does not introduce a client router
or change component initialization; progress is carried in the one-use marker.
