# Astro Docs tutorial components with OreUI styling

MultipleChoice.astro, Option.astro, Checklist.astro, and ProgressStore.ts are
adapted from https://github.com/withastro/docs at revision
22752c0ed9088bae0fabd2f15499f4151fe84cec (retrieved 2026-10-12).
Original paths: src/components/tutorial/{MultipleChoice.astro,Option.astro,ProgressStore.ts}
and src/components/Checklist.astro. Box.astro adapts the upstream tutorial/Box.astro
wrapper with Starlight icons in place of documentation-site image assets.
Upstream MIT license is included in LICENSE.

Changes: Chinese labels replace documentation-specific translation keys; OreUI CSS
replaces upstream styles; checklist imports use local paths; progress uses a wiki-specific
storage key, full decoded page paths, and validation of stored checkbox values.
Official selection, feedback, retry, and checklist persistence behavior is retained.

Use in MDX; no client:* directive or React/Vue dependency is needed. Checklist accepts
Markdown task lists. Give each checklist on a page a distinct, stable key.
