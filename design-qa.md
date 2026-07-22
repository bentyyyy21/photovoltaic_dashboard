**Design QA**

- Source visual truth: `C:\Users\ben2026\.codex\generated_images\019f8289-34e1-7d00-ba5f-893131d82a2f\exec-aaa70f89-4beb-4e99-a9e1-5bc29b73c073.png`
- Implementation screenshots: `D:\Coding\photovoltaic_dashboard\.data-cache\qa-map-desktop.png`, `D:\Coding\photovoltaic_dashboard\.data-cache\qa-chart-tooltip.png`, `D:\Coding\photovoltaic_dashboard\.data-cache\qa-mobile-bar.png`, `D:\Coding\photovoltaic_dashboard\.data-cache\qa-mobile-line.png`
- Captured viewports: 1440 x 1000 desktop and 390 x 844 mobile
- State: national overview and realtime multi-province trend, 2025-06 to 2026-06

**Full-View Comparison**

- The implementation matches the selected structure: compact brand/navigation bar, single filter command bar, map/ranking/summary overview band, and one focus-plus-context trend workspace.
- Existing national comparison charts, parameter tables, and province analysis remain in the page and share the refreshed surface, typography, spacing, and table tokens.

**Focused Region Comparison**

- National overview: the PPT-derived map is the dominant left visual; ranking and four-value summary are stacked on the right. Hover and keyboard focus link map regions with ranking rows, while click selection persists and exposes an out-of-top-five province at its actual rank. The continuous blue-white-yellow-orange-red scale follows the official ECharts projection example.
- Trend workspace: realtime is the default; Guangdong, Fujian, Chongqing, and Shanxi are selected by default. Non-selected provinces remain as low-opacity context lines, while focused series use smooth high-contrast curves. Axis-trigger hover adds a guide line, emphasized nodes, and a structured dark tooltip.
- National comparison: the day-ahead and realtime bars use vertical gradients, rounded tops, retained hover hit areas, and the original light-blue table-header color family.
- Tables and province section: verified from HTML/CSS structure, selector coverage, and rendered lower-section browser captures.

**Findings**

- [Resolved P2] Watermark placement and interaction.
  Fix: restored the requested fixed bottom-right brand watermark, kept it non-interactive, and added compact mobile offsets so it remains anchored while scrolling.
- [Resolved P2] Selected trend colors could be visually similar because colors followed province index.
  Fix: selected provinces now receive a stable blue/orange/green/purple/cyan/red focus palette; all other series use neutral low-opacity context lines.
- [Resolved P2] Mobile overflow risk.
  Fix: captured the dashboard at a 390 x 844 viewport and verified `scrollWidth` equals `clientWidth` (390px), with no horizontal overflow.
- [Resolved P2] Static map/ranking relationship and plain chart hover.
  Fix: added bidirectional map/ranking highlighting, persistent province selection, proportional ranking bars, axis pointers, colored hover nodes, and structured multi-series tooltips.
- [Resolved P2] Static heat legend.
  Fix: added segmented hover inspection with province labels, two-handle range filtering, out-of-range dimming, and province-to-axis value markers. Automated checks confirmed all three states and a 390px overflow-free mobile layout.
- [Resolved P2] Mobile charts compressed a desktop-sized canvas, making labels small and clipping the final month.
  Fix: render canvases at the actual mobile width, center month labels with a larger right inset, and show national bars through a seven-province draggable window. Automated checks confirmed `5–11 / 21`, a complete `2026-06` label, and `scrollWidth === clientWidth` at 390px.
- [Resolved P2] Unselected context lines could not be identified.
  Fix: added sampled Bezier near-line hit testing for unselected province curves. Hovering the unselected Yunnan series was automatically verified to show only `云南` without changing selection state.
- [Resolved P2] Fresh links could restore a province anchor or stale scroll position.
  Fix: disabled browser scroll restoration for initial load, removed stale hashes, and focused the national map after rendering. A full load with `#provinceModule` was verified to end with an empty hash, active national navigation, and the map 8px from the viewport top.

**Required Fidelity Surfaces**

- Fonts and typography: Microsoft YaHei/Segoe UI stack, compact 12-16px analytical scale, tabular numerals, no negative letter spacing.
- Spacing and layout: 4-6px radii, 10-14px section rhythm, divider-led grouping, no nested section cards.
- Colors and visual tokens: pale blue-gray canvas, white analysis surfaces, navy text, TCL red export/price-mode actions, blue secondary actions, and an 11-stop blue-white-yellow-orange-red heat scale.
- Image quality and assets: existing raster TCL logo and PPT-derived map asset retained without substitutes.
- Copy and content: existing Chinese product copy, province names, period labels, parameter tables, and export commands retained.

**Comparison History**

1. Initial desktop capture found watermark overlap and weak focus-color differentiation.
2. Fixed watermark offsets and focused-series palette were corrected; JavaScript syntax, selector coverage, HTML IDs, and CSS brace balance passed.
3. Added realtime defaults, four-province focus, smooth curves, gradient bars, and restored table-header colors; desktop and mobile captures passed.
4. Enlarged the national map, stacked the supporting panels, and verified map selection plus axis-trigger chart interaction in headless Edge.
5. Added continuous visual-map inspection, dual range handles, province labels, and value markers; verified all interactions in headless Edge.
6. Added mobile bar-axis navigation and true-width canvas rendering; inspected dedicated mobile bar and line screenshots.
7. Added near-line identification for unselected context curves and verified the compact province-only tooltip.
8. Verified fresh-link default positioning with a stale province hash while preserving normal in-page navigation.
9. Rebuilt the national parameter module from the three named workbook sheets, arranged the two reference-price tables above the full-width mechanism table, and verified independent ascending/descending sorting. Equal-width parameter columns and table-contained mobile scrolling were confirmed at 1440px and 390px.
10. Added a persistent day/night theme control and verified dark surfaces, table headers, controls, map, canvas chart grids/labels, fixed watermark, reload persistence, and a 390px overflow-free mobile viewport.
11. Simplified province map tooltips by removing the repeated period and adding the latest maintained settlement reference price within the selected range. Verified province-name normalization, numeric and text references, and the Guangdong fallback from empty June data to May 2026.

**Implementation Checklist**

- [x] National overview hierarchy
- [x] Interactive map and ranking linkage
- [x] Interactive heat scale and range filtering
- [x] Axis-trigger chart tooltips
- [x] Focus-plus-context trend chart
- [x] Province search and visibility controls
- [x] Day-ahead/realtime trend switch
- [x] Date-range navigator
- [x] Unified national, parameter, and province table styling
- [x] Desktop comparison capture
- [x] Mobile browser capture
- [x] Mobile bar-axis range navigation
- [x] Mobile final-month label visibility
- [x] Unselected province curve identification
- [x] Fresh-link national map positioning
- [x] Updated parameter workbook structure and values
- [x] Independent parameter-column sorting
- [x] Equal-width parameter table columns
- [x] Persistent day/night theme switching
- [x] Theme-aware canvas chart rendering
- [x] Map tooltip settlement reference prices

final result: passed
