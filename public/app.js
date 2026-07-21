const state = {
  data: null,
  nationalTrendMarket: "实时",
  focusedNationalSeries: new Set(),
  showTrendContext: true,
  trendSearch: "",
  hiddenProvinceSeries: new Set(),
  mapMode: "price",
  mapReady: false,
  mapValues: new Map(),
  selectedMapProvince: null,
  mapRankingContext: null,
  heatRange: [0, 100],
  mapScale: null,
  parameterSort: {},
  theme: document.documentElement.dataset.theme || "light",
};

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const NATIONAL_DEFAULT_START = "2025-06";
const NATIONAL_DEFAULT_END = "2026-06";
const PROVINCE_DEFAULT_START = "2026-01";
const PROVINCE_DEFAULT_END = "2026-06";
const chartHits = new WeakMap();
const barChartOffsets = new WeakMap();
const MAP_PRICE_ALIASES = {
  冀南: "河北",
  蒙东: "内蒙古",
};
const HEAT_COLORS = [
  "#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#ffffbf",
  "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026",
];
const FOCUS_COLORS = ["#1769d2", "#f97316", "#3a9b35", "#8b5cf6", "#0891b2", "#dc3f64"];

const els = {
  stamp: document.querySelector("#dataStamp"),
  province: document.querySelector("#provinceSelect"),
  provinceStart: document.querySelector("#provinceStartMonth"),
  provinceEnd: document.querySelector("#provinceEndMonth"),
  nationalStart: document.querySelector("#nationalStartMonth"),
  nationalEnd: document.querySelector("#nationalEndMonth"),
  mode: document.querySelector("#calcMode"),
  dayAvg: document.querySelector("#dayAvg"),
  realAvg: document.querySelector("#realAvg"),
  monthCount: document.querySelector("#monthCount"),
  volumeTotal: document.querySelector("#volumeTotal"),
  resultRows: document.querySelector("#resultRows"),
  chart: document.querySelector("#trendChart"),
  nationalDayChart: document.querySelector("#nationalDayChart"),
  nationalRealChart: document.querySelector("#nationalRealChart"),
  nationalTrendChart: document.querySelector("#nationalTrendChart"),
  nationalTrendTitle: document.querySelector("#nationalTrendTitle"),
  nationalTrendPeriod: document.querySelector("#nationalTrendPeriod"),
  nationalTrendSearch: document.querySelector("#nationalTrendSearch"),
  nationalTrendSelector: document.querySelector("#nationalTrendSelector"),
  trendMarketButtons: document.querySelectorAll("[data-trend-market]"),
  focusAllProvinces: document.querySelector("#focusAllProvinces"),
  clearFocusedProvinces: document.querySelector("#clearFocusedProvinces"),
  toggleTrendContext: document.querySelector("#toggleTrendContext"),
  trendRangeStart: document.querySelector("#trendRangeStart"),
  trendRangeEnd: document.querySelector("#trendRangeEnd"),
  trendRangeStartLabel: document.querySelector("#trendRangeStartLabel"),
  trendRangeEndLabel: document.querySelector("#trendRangeEndLabel"),
  provinceTrendLegend: document.querySelector("#provinceTrendLegend"),
  nationalDayRows: document.querySelector("#nationalDayRows"),
  nationalRealRows: document.querySelector("#nationalRealRows"),
  nationalDayHint: document.querySelector("#nationalDayHint"),
  nationalRealHint: document.querySelector("#nationalRealHint"),
  priceParams: document.querySelector("#priceParams"),
  disclosureHead: document.querySelector("#disclosureHead"),
  disclosureRows: document.querySelector("#disclosureRows"),
  mechanismHead: document.querySelector("#mechanismHead"),
  mechanismRows: document.querySelector("#mechanismRows"),
  settlementHead: document.querySelector("#settlementHead"),
  settlementRows: document.querySelector("#settlementRows"),
  exportProvince: document.querySelector("#exportProvince"),
  exportNational: document.querySelector("#exportNational"),
  mapTitle: document.querySelector("#mapTitle"),
  mapPeriodHint: document.querySelector("#mapPeriodHint"),
  mapModeButtons: document.querySelectorAll("[data-map-mode]"),
  mapMarketControl: document.querySelector("#mapMarketControl"),
  mapCapacityControl: document.querySelector("#mapCapacityControl"),
  mapMarket: document.querySelector("#mapMarketSelect"),
  mapCapacity: document.querySelector("#mapCapacitySelect"),
  mapStage: document.querySelector("#mapStage"),
  mapHost: document.querySelector("#chinaMapHost"),
  mapRangeLabels: document.querySelector("#mapRangeLabels"),
  mapTooltip: document.querySelector("#mapTooltip"),
  mapLegendTitle: document.querySelector("#mapLegendTitle"),
  mapLegendUnit: document.querySelector("#mapLegendUnit"),
  mapLegendMin: document.querySelector("#mapLegendMin"),
  mapLegendMid: document.querySelector("#mapLegendMid"),
  mapLegendMax: document.querySelector("#mapLegendMax"),
  heatScaleTrack: document.querySelector("#heatScaleTrack"),
  heatHoverBand: document.querySelector("#heatHoverBand"),
  heatRangeSelection: document.querySelector("#heatRangeSelection"),
  heatValueMarker: document.querySelector("#heatValueMarker"),
  heatRangeMin: document.querySelector("#heatRangeMin"),
  heatRangeMax: document.querySelector("#heatRangeMax"),
  heatRangeTooltip: document.querySelector("#heatRangeTooltip"),
  heatRangeSummary: document.querySelector("#heatRangeSummary"),
  overviewRankingTitle: document.querySelector("#overviewRankingTitle"),
  overviewRankingPeriod: document.querySelector("#overviewRankingPeriod"),
  overviewRankingRows: document.querySelector("#overviewRankingRows"),
  overviewPeriod: document.querySelector("#overviewPeriod"),
  overviewDayAvg: document.querySelector("#overviewDayAvg"),
  overviewRealAvg: document.querySelector("#overviewRealAvg"),
  overviewTopValue: document.querySelector("#overviewTopValue"),
  overviewTopProvince: document.querySelector("#overviewTopProvince"),
  overviewLowValue: document.querySelector("#overviewLowValue"),
  overviewLowProvince: document.querySelector("#overviewLowProvince"),
  provinceLabels: document.querySelectorAll("[data-province-label]"),
  navLinks: document.querySelectorAll(".dashboard-nav a"),
  themeToggle: document.querySelector("#themeToggle"),
};

const marketOrder = ["日前", "实时"];

function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmtParameter(value, digits = 4, percent = false) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "number") {
    return percent ? `${fmt(value * 100, 1)}%` : fmt(value, digits);
  }
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function applyTheme(theme, persist = true) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  const nextLabel = state.theme === "dark" ? "切换至日间模式" : "切换至夜间模式";
  els.themeToggle.setAttribute("aria-label", nextLabel);
  els.themeToggle.title = nextLabel;
  els.themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
  if (persist) {
    try {
      localStorage.setItem("pv-dashboard-theme", state.theme);
    } catch (_error) {
      // Theme still applies when storage is unavailable.
    }
  }
  if (state.data) render();
}

function setActiveNavigation(targetId) {
  els.navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${targetId}`);
  });
}

function focusDefaultNationalMap() {
  if (window.location.hash) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
  setActiveNavigation("nationalModule");
  const mapPanel = document.querySelector(".overview-panel");
  if (!mapPanel) return;
  const top = Math.max(0, mapPanel.getBoundingClientRect().top + window.scrollY - 8);
  window.scrollTo({ top, left: 0, behavior: "auto" });
}

function initNavigation() {
  els.navLinks.forEach((link) => {
    link.addEventListener("click", () => setActiveNavigation(link.getAttribute("href").slice(1)));
  });
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveNavigation(visible.target.id);
  }, {
    rootMargin: "-24% 0px -66% 0px",
    threshold: [0, 0.1, 0.25],
  });
  document.querySelectorAll(".dashboard-anchor").forEach((section) => observer.observe(section));
}

function escapeChartText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const ratio = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + ratio * dx), py - (y1 + ratio * dy));
}

function registerChartHits(canvas, hits, width, height) {
  chartHits.set(canvas, { hits, width, height });
  if (canvas.dataset.interactive === "true") return;
  canvas.dataset.interactive = "true";
  const tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.hidden = true;
  canvas.parentElement.appendChild(tooltip);
  const axisLine = document.createElement("div");
  axisLine.className = "chart-axis-pointer";
  axisLine.hidden = true;
  canvas.parentElement.appendChild(axisLine);
  const hoverDots = document.createElement("div");
  hoverDots.className = "chart-hover-dots";
  hoverDots.hidden = true;
  canvas.parentElement.appendChild(hoverDots);

  const hideHover = () => {
    tooltip.hidden = true;
    axisLine.hidden = true;
    hoverDots.hidden = true;
    hoverDots.innerHTML = "";
    canvas.style.cursor = "default";
  };

  canvas.addEventListener("pointermove", (event) => {
    const meta = chartHits.get(canvas);
    if (!meta) return;
    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    const x = cssX * (meta.width / rect.width);
    const y = cssY * (meta.height / rect.height);
    const hit = meta.hits.find((item) => {
      if (item.type === "rect") return x >= item.x1 && x <= item.x2 && y >= item.y1 && y <= item.y2;
      if (item.type === "segment") {
        return distanceToSegment(x, y, item.x1, item.y1, item.x2, item.y2) <= (item.radius || 6);
      }
      return Math.hypot(x - item.x, y - item.y) <= (item.radius || 8);
    });
    if (!hit) {
      hideHover();
      return;
    }
    tooltip.classList.toggle("is-context-label", Boolean(hit.contextLabel));
    if (hit.tooltipRows?.length) {
      tooltip.innerHTML = `
        <strong class="chart-tooltip-title">${escapeChartText(hit.tooltipTitle || "")}</strong>
        <span class="chart-tooltip-list">${hit.tooltipRows.map((row) => `
          <span class="chart-tooltip-row">
            <i style="--series-color:${escapeChartText(row.color || "#94a3b8")}"></i>
            <span>${escapeChartText(row.name)}</span>
            <b>${escapeChartText(row.value)}</b>
          </span>`).join("")}</span>`;
    } else {
      tooltip.textContent = hit.label;
    }
    tooltip.hidden = false;
    const parent = canvas.parentElement;
    const axisCssX = hit.axisX === undefined ? cssX : hit.axisX * (rect.width / meta.width);
    const preferredLeft = axisCssX > rect.width * 0.62
      ? canvas.offsetLeft + axisCssX - tooltip.offsetWidth - 14
      : canvas.offsetLeft + axisCssX + 14;
    const preferredTop = canvas.offsetTop + Math.max(8, Math.min(cssY - tooltip.offsetHeight / 2, rect.height - tooltip.offsetHeight - 8));
    const maxLeft = Math.max(8, parent.clientWidth - tooltip.offsetWidth - 8);
    const maxTop = Math.max(8, parent.clientHeight - tooltip.offsetHeight - 8);
    tooltip.style.left = `${Math.min(Math.max(8, preferredLeft), maxLeft)}px`;
    tooltip.style.top = `${Math.min(Math.max(8, preferredTop), maxTop)}px`;

    if (hit.axisX !== undefined) {
      const scaleX = rect.width / meta.width;
      const scaleY = rect.height / meta.height;
      axisLine.hidden = false;
      axisLine.style.left = `${canvas.offsetLeft + hit.axisX * scaleX}px`;
      axisLine.style.top = `${canvas.offsetTop + (hit.axisTop || 0) * scaleY}px`;
      axisLine.style.height = `${((hit.axisBottom ?? meta.height) - (hit.axisTop || 0)) * scaleY}px`;
      hoverDots.innerHTML = (hit.points || []).map((point) => `
        <i style="left:${canvas.offsetLeft + point.x * scaleX}px;top:${canvas.offsetTop + point.y * scaleY}px;--series-color:${escapeChartText(point.color)}"></i>`).join("");
      hoverDots.hidden = !(hit.points || []).length;
    } else {
      axisLine.hidden = true;
      hoverDots.hidden = true;
    }
    canvas.style.cursor = "crosshair";
  });
  canvas.addEventListener("pointerleave", hideHover);
}

function renderToggleLegend(container, items, hiddenSet, onChange) {
  container.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `legend-item${hiddenSet.has(item.name) ? " is-hidden" : ""}`;
    button.setAttribute("aria-pressed", hiddenSet.has(item.name) ? "false" : "true");
    button.innerHTML = `<span style="background:${item.color}"></span>${item.name}`;
    button.addEventListener("click", () => {
      if (hiddenSet.has(item.name)) hiddenSet.delete(item.name);
      else hiddenSet.add(item.name);
      onChange();
    });
    container.appendChild(button);
  });
}

function selectedRows() {
  const province = els.province.value;
  const start = els.provinceStart.value;
  const end = els.provinceEnd.value;
  return state.data.monthly
    .filter((row) => row.province === province && row.month >= start && row.month <= end)
    .sort((a, b) => a.month.localeCompare(b.month) || marketOrder.indexOf(a.market) - marketOrder.indexOf(b.market));
}

function weightedCycle(rows, market, province = els.province.value, start = els.provinceStart.value, end = els.provinceEnd.value) {
  const subset = rows.filter((row) => row.market === market);
  const volume = subset.reduce((sum, row) => sum + row.volume, 0);
  const priceVolume = subset.reduce((sum, row) => sum + (row.weightedAvg || 0) * row.volume, 0);
  return {
    province,
    period: `${start} 至 ${end}`,
    market,
    weightedAvg: volume ? priceVolume / volume : null,
    volume,
    months: subset.length,
    points: subset.reduce((sum, row) => sum + row.points, 0),
  };
}

function cycleRows(rows) {
  return marketOrder.map((market) => {
    return weightedCycle(rows, market);
  });
}

function fillSelect(select, values) {
  select.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function availableMonths(province = els.province.value) {
  return [...new Set(state.data.monthly
    .filter((row) => row.province === province)
    .map((row) => row.month))].sort();
}

function updateProvinceMonths(preserveSelection = true) {
  const months = availableMonths();
  const previousStart = els.provinceStart.value;
  const previousEnd = els.provinceEnd.value;
  fillSelect(els.provinceStart, months);
  fillSelect(els.provinceEnd, months);
  if (!months.length) return;
  const defaultStart = months.includes(PROVINCE_DEFAULT_START) ? PROVINCE_DEFAULT_START : months[0];
  const defaultEnd = months.includes(PROVINCE_DEFAULT_END) ? PROVINCE_DEFAULT_END : months[months.length - 1];
  els.provinceStart.value = preserveSelection && months.includes(previousStart) ? previousStart : defaultStart;
  els.provinceEnd.value = preserveSelection && months.includes(previousEnd) ? previousEnd : defaultEnd;
  if (els.provinceStart.value > els.provinceEnd.value) {
    els.provinceStart.value = defaultStart;
    els.provinceEnd.value = defaultEnd;
  }
}

function updateNationalMonths(preserveSelection = true) {
  const months = [...new Set(state.data.monthly.map((row) => row.month))].sort();
  const previousStart = els.nationalStart.value;
  const previousEnd = els.nationalEnd.value;
  fillSelect(els.nationalStart, months);
  fillSelect(els.nationalEnd, months);
  if (!months.length) return;
  const defaultStart = months.includes(NATIONAL_DEFAULT_START) ? NATIONAL_DEFAULT_START : months[0];
  const defaultEnd = months.includes(NATIONAL_DEFAULT_END) ? NATIONAL_DEFAULT_END : months[months.length - 1];
  els.nationalStart.value = preserveSelection && months.includes(previousStart) ? previousStart : defaultStart;
  els.nationalEnd.value = preserveSelection && months.includes(previousEnd) ? previousEnd : defaultEnd;
  if (els.nationalStart.value > els.nationalEnd.value) {
    els.nationalStart.value = defaultStart;
    els.nationalEnd.value = defaultEnd;
  }
}

function nationalRows(market) {
  const start = els.nationalStart.value;
  const end = els.nationalEnd.value;
  return state.data.provinces.map((item) => weightedCycle(
    state.data.monthly.filter((row) => row.province === item.name && row.month >= start && row.month <= end),
    market,
    item.name,
    start,
    end,
  ))
    .filter((row) => row.weightedAvg !== null)
    .sort((a, b) => (b.weightedAvg || 0) - (a.weightedAvg || 0));
}

function mapPriceValues(market) {
  const start = els.nationalStart.value;
  const end = els.nationalEnd.value;
  const aggregates = new Map();
  state.data.monthly
    .filter((row) => row.market === market && row.month >= start && row.month <= end)
    .forEach((row) => {
      const province = MAP_PRICE_ALIASES[row.province] || row.province;
      const current = aggregates.get(province) || { priceVolume: 0, volume: 0 };
      current.priceVolume += Number(row.weightedAvg || 0) * Number(row.volume || 0);
      current.volume += Number(row.volume || 0);
      aggregates.set(province, current);
    });
  return new Map([...aggregates.entries()]
    .filter(([, item]) => item.volume > 0)
    .map(([province, item]) => [province, item.priceVolume / item.volume]));
}

function mapCapacityValues(source) {
  const provinces = state.data.capacity?.provinces || {};
  return new Map(Object.entries(provinces)
    .map(([province, values]) => [province, Number(values?.[source])])
    .filter(([, value]) => Number.isFinite(value)));
}

function hexRgb(color) {
  return [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16));
}

function heatColor(value, min, max) {
  const ratio = max === min ? 0.55 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const scaled = ratio * (HEAT_COLORS.length - 1);
  const index = Math.min(HEAT_COLORS.length - 2, Math.floor(scaled));
  const localRatio = scaled - index;
  const from = hexRgb(HEAT_COLORS[index]);
  const to = hexRgb(HEAT_COLORS[index + 1]);
  const rgb = from.map((channel, channelIndex) => Math.round(channel + (to[channelIndex] - channel) * localRatio));
  return `rgb(${rgb.join(", ")})`;
}

function heatScaleValue(ratio) {
  if (!state.mapScale) return 0;
  return state.mapScale.min + (state.mapScale.max - state.mapScale.min) * Math.max(0, Math.min(1, ratio));
}

function heatBucketAt(ratio) {
  const bucketCount = 5;
  const index = Math.min(bucketCount - 1, Math.floor(Math.max(0, Math.min(0.9999, ratio)) * bucketCount));
  return {
    index,
    startRatio: index / bucketCount,
    endRatio: (index + 1) / bucketCount,
  };
}

function provincesInHeatRange(startRatio, endRatio) {
  if (!state.mapScale) return [];
  const low = heatScaleValue(startRatio);
  const high = heatScaleValue(endRatio);
  return [...state.mapScale.values.entries()]
    .filter(([, value]) => Number.isFinite(value) && value >= low && value <= high)
    .sort((a, b) => b[1] - a[1])
    .map(([province]) => province);
}

function renderMapRangeLabels(provinces) {
  els.mapRangeLabels.innerHTML = "";
  if (!state.mapReady || !provinces.length) return;
  const stageRect = els.mapStage.getBoundingClientRect();
  provinces.forEach((province) => {
    const paths = [...els.mapHost.querySelectorAll("[data-province]")]
      .filter((path) => path.dataset.province === province);
    const path = paths.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return bRect.width * bRect.height - aRect.width * aRect.height;
    })[0];
    if (!path) return;
    const rect = path.getBoundingClientRect();
    const label = document.createElement("span");
    label.textContent = province;
    label.style.left = `${rect.left - stageRect.left + rect.width / 2}px`;
    label.style.top = `${rect.top - stageRect.top + rect.height / 2}px`;
    els.mapRangeLabels.appendChild(label);
  });
}

function restoreFilteredMapLabels() {
  const [low, high] = state.heatRange;
  renderMapRangeLabels(low === 0 && high === 100 ? [] : provincesInHeatRange(low / 100, high / 100));
}

function updateHeatSelectionDisplay() {
  if (!state.mapScale) return;
  const [low, high] = state.heatRange;
  els.heatRangeSelection.style.left = `${low}%`;
  els.heatRangeSelection.style.width = `${Math.max(0, high - low)}%`;
  els.heatRangeMin.value = String(low);
  els.heatRangeMax.value = String(high);
  const lowValue = heatScaleValue(low / 100);
  const highValue = heatScaleValue(high / 100);
  const count = provincesInHeatRange(low / 100, high / 100).length;
  els.heatRangeSummary.textContent = low === 0 && high === 100
    ? `全部省份 · ${count}个`
    : `${fmt(lowValue, state.mapScale.digits)}–${fmt(highValue, state.mapScale.digits)} ${state.mapScale.unit} · ${count}个省份`;
}

function showHeatScaleHover(event) {
  if (!state.mapScale) return;
  const rect = els.heatScaleTrack.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const bucket = heatBucketAt(ratio);
  const provinces = provincesInHeatRange(bucket.startRatio, bucket.endRatio);
  const low = heatScaleValue(bucket.startRatio);
  const high = heatScaleValue(bucket.endRatio);
  els.heatHoverBand.hidden = false;
  els.heatHoverBand.style.left = `${bucket.startRatio * 100}%`;
  els.heatHoverBand.style.width = `${(bucket.endRatio - bucket.startRatio) * 100}%`;
  els.heatRangeTooltip.innerHTML = `
    <strong>${fmt(low, state.mapScale.digits)}–${fmt(high, state.mapScale.digits)} ${escapeHtml(state.mapScale.unit)}</strong>
    <span>${provinces.length ? provinces.map(escapeHtml).join("、") : "该区间暂无省份"}</span>`;
  els.heatRangeTooltip.hidden = false;
  const maxLeft = rect.width - els.heatRangeTooltip.offsetWidth;
  const tooltipLeft = els.heatRangeTooltip.offsetWidth > rect.width
    ? maxLeft
    : Math.max(0, Math.min(maxLeft, event.clientX - rect.left - els.heatRangeTooltip.offsetWidth / 2));
  els.heatRangeTooltip.style.left = `${tooltipLeft}px`;
  renderMapRangeLabels(provinces);
}

function hideHeatScaleHover() {
  els.heatHoverBand.hidden = true;
  els.heatRangeTooltip.hidden = true;
  restoreFilteredMapLabels();
}

function updateHeatValueMarker(province, visible) {
  const item = state.mapValues.get(province);
  if (!visible || !item || !state.mapScale) {
    els.heatValueMarker.hidden = true;
    return;
  }
  const span = state.mapScale.max - state.mapScale.min || 1;
  const ratio = Math.max(0, Math.min(1, (item.value - state.mapScale.min) / span));
  const bucket = heatBucketAt(ratio);
  els.heatValueMarker.style.left = `${ratio * 100}%`;
  els.heatValueMarker.classList.toggle("is-left", ratio < 0.18);
  els.heatValueMarker.classList.toggle("is-right", ratio > 0.82);
  els.heatValueMarker.querySelector("span").innerHTML = `
    <strong>${escapeHtml(province)} ${fmt(item.value, item.digits)}</strong>
    <small>${fmt(heatScaleValue(bucket.startRatio), item.digits)}–${fmt(heatScaleValue(bucket.endRatio), item.digits)}</small>`;
  els.heatValueMarker.hidden = false;
}

function initHeatLegendInteraction() {
  els.heatScaleTrack.addEventListener("pointermove", showHeatScaleHover);
  els.heatScaleTrack.addEventListener("pointerleave", hideHeatScaleHover);
  const updateRange = (source) => {
    let low = Number(els.heatRangeMin.value);
    let high = Number(els.heatRangeMax.value);
    if (source === "min" && low > high) low = high;
    if (source === "max" && high < low) high = low;
    state.heatRange = [low, high];
    renderHeatmap();
  };
  els.heatRangeMin.addEventListener("input", () => updateRange("min"));
  els.heatRangeMax.addEventListener("input", () => updateRange("max"));
  els.heatScaleTrack.addEventListener("dblclick", () => {
    state.heatRange = [0, 100];
    renderHeatmap();
  });
}

function mapTooltipHtml(province) {
  const item = state.mapValues.get(province);
  if (!item) return `<strong>${escapeHtml(province)}</strong><span>暂无数据</span>`;
  return `
    <strong>${escapeHtml(province)}</strong>
    <span>${escapeHtml(item.metric)}：${fmt(item.value, item.digits)} ${escapeHtml(item.unit)}</span>
    <span>${escapeHtml(item.period)}</span>
  `;
}

function showMapTooltip(event, province) {
  els.mapTooltip.innerHTML = mapTooltipHtml(province);
  els.mapTooltip.hidden = false;
  const stageRect = els.mapStage.getBoundingClientRect();
  const pointerX = Number.isFinite(event?.clientX) ? event.clientX - stageRect.left : stageRect.width / 2;
  const pointerY = Number.isFinite(event?.clientY) ? event.clientY - stageRect.top : stageRect.height / 2;
  const left = Math.min(
    Math.max(8, pointerX + 12),
    Math.max(8, stageRect.width - els.mapTooltip.offsetWidth - 8),
  );
  const top = Math.min(
    Math.max(8, pointerY + 12),
    Math.max(8, stageRect.height - els.mapTooltip.offsetHeight - 8),
  );
  els.mapTooltip.style.left = `${left}px`;
  els.mapTooltip.style.top = `${top}px`;
}

function initializeMapInteraction() {
  els.mapHost.querySelectorAll("[data-province]").forEach((path) => {
    const province = path.dataset.province;
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.addEventListener("mousemove", (event) => showMapTooltip(event, province));
    path.addEventListener("mouseenter", () => previewMapProvince(province, true));
    path.addEventListener("mouseleave", () => {
      previewMapProvince(province, false);
      els.mapTooltip.hidden = true;
    });
    path.addEventListener("focus", () => showMapTooltip(null, province));
    path.addEventListener("blur", () => { els.mapTooltip.hidden = true; });
    path.addEventListener("click", (event) => selectMapProvince(province, event));
    path.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectMapProvince(province, null);
    });
  });
}

async function loadMap() {
  if (window.CHINA_MAP_SVG) {
    els.mapHost.innerHTML = window.CHINA_MAP_SVG;
  } else {
    const response = await fetch("./public/assets/china-map.svg");
    if (!response.ok) throw new Error(`地图资源 HTTP ${response.status}`);
    els.mapHost.innerHTML = await response.text();
  }
  state.mapReady = true;
  initializeMapInteraction();
}

function setMapMode(mode) {
  state.mapMode = mode;
  state.heatRange = [0, 100];
  els.mapModeButtons.forEach((button) => {
    const active = button.dataset.mapMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  els.mapMarketControl.hidden = mode !== "price";
  els.mapCapacityControl.hidden = mode !== "capacity";
  renderHeatmap();
}

function applyMapSelection() {
  els.mapHost.querySelectorAll("[data-province]").forEach((path) => {
    const selected = path.dataset.province === state.selectedMapProvince;
    path.classList.toggle("is-selected", selected);
    path.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function previewMapProvince(province, active) {
  els.mapHost.querySelectorAll("[data-province]").forEach((path) => {
    path.classList.toggle("is-preview", active && path.dataset.province === province);
  });
  els.overviewRankingRows.querySelectorAll("[data-ranking-province]").forEach((row) => {
    row.classList.toggle("is-preview", active && row.dataset.rankingProvince === province);
  });
  updateHeatValueMarker(province, active);
}

function selectMapProvince(province, event) {
  state.selectedMapProvince = province;
  applyMapSelection();
  if (state.mapRankingContext) renderOverviewRanking(...state.mapRankingContext);
  showMapTooltip(event, province);
}

function renderOverviewRanking(values, metric, unit, digits, period) {
  state.mapRankingContext = [values, metric, unit, digits, period];
  const allRanked = [...values.entries()]
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1]);
  const ranked = allRanked.slice(0, 5).map(([province, value], index) => ({ province, value, rank: index + 1 }));
  const selectedIndex = allRanked.findIndex(([province]) => province === state.selectedMapProvince);
  if (selectedIndex >= 5) {
    const [province, value] = allRanked[selectedIndex];
    ranked.push({ province, value, rank: selectedIndex + 1 });
  }
  const maxValue = allRanked[0]?.[1] || 1;
  els.overviewRankingTitle.textContent = `${metric}省份排名`;
  els.overviewRankingPeriod.textContent = period;
  els.overviewRankingRows.innerHTML = ranked.map(({ province, value, rank }) => `
    <li class="${province === state.selectedMapProvince ? "is-selected" : ""}" data-ranking-province="${escapeHtml(province)}" tabindex="0" role="button" style="--rank-progress:${Math.max(4, (value / maxValue) * 100)}%">
      <i class="rank-bar" aria-hidden="true"></i>
      <span class="rank-number">${rank}</span>
      <strong>${escapeHtml(province)}</strong>
      <span>${fmt(value, digits)}</span>
      <small>${escapeHtml(unit)}</small>
    </li>
  `).join("") || `<li class="empty">暂无可排名数据</li>`;
  els.overviewRankingRows.querySelectorAll("[data-ranking-province]").forEach((row) => {
    const province = row.dataset.rankingProvince;
    const activate = () => selectMapProvince(province, null);
    row.addEventListener("click", activate);
    row.addEventListener("mouseenter", () => previewMapProvince(province, true));
    row.addEventListener("mouseleave", () => previewMapProvince(province, false));
    row.addEventListener("focus", () => previewMapProvince(province, true));
    row.addEventListener("blur", () => previewMapProvince(province, false));
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    });
  });
}

function renderHeatmap() {
  const isPrice = state.mapMode === "price";
  const market = els.mapMarket.value;
  const source = els.mapCapacity.value;
  const unit = isPrice ? "元/MWh" : (state.data.capacity?.unit || "万千瓦");
  const metric = isPrice ? `${market}光伏加权均价` : `${source}装机规模`;
  const period = isPrice
    ? `${els.nationalStart.value} 至 ${els.nationalEnd.value}`
    : `${state.data.capacity?.year || "--"}年装机`;
  const values = isPrice ? mapPriceValues(market) : mapCapacityValues(source);
  const numericValues = [...values.values()].filter((value) => Number.isFinite(value));
  const min = numericValues.length ? (isPrice ? Math.min(...numericValues) : 0) : 0;
  const max = numericValues.length ? Math.max(...numericValues) : 1;
  const digits = isPrice ? 2 : 0;

  state.mapScale = { values, min, max, digits, unit, metric, period };
  const [rangeLow, rangeHigh] = state.heatRange;
  const selectedLow = heatScaleValue(rangeLow / 100);
  const selectedHigh = heatScaleValue(rangeHigh / 100);
  const filteredValues = new Map([...values.entries()]
    .filter(([, value]) => Number.isFinite(value) && value >= selectedLow && value <= selectedHigh));

  state.mapValues = new Map([...values.entries()].map(([province, value]) => [province, {
    value,
    unit,
    metric,
    period,
    digits,
  }]));
  els.mapTitle.textContent = `各省${metric}`;
  els.mapPeriodHint.textContent = period;
  els.mapLegendTitle.textContent = metric;
  els.mapLegendUnit.textContent = unit;
  els.mapLegendMin.textContent = numericValues.length ? fmt(min, digits) : "--";
  els.mapLegendMid.textContent = numericValues.length ? fmt((min + max) / 2, digits) : "--";
  els.mapLegendMax.textContent = numericValues.length ? fmt(max, digits) : "--";
  renderOverviewRanking(filteredValues, metric, unit, digits, period);
  updateHeatSelectionDisplay();

  if (!state.mapReady) return;
  els.mapHost.querySelectorAll("[data-province]").forEach((path) => {
    const province = path.dataset.province;
    const value = values.get(province);
    const hasValue = Number.isFinite(value);
    const inSelectedRange = hasValue && value >= selectedLow && value <= selectedHigh;
    path.style.fill = hasValue && numericValues.length ? heatColor(value, min, max) : "#d8e0e7";
    path.classList.toggle("has-no-data", !hasValue);
    path.classList.toggle("is-out-of-range", hasValue && !inSelectedRange);
    path.setAttribute(
      "aria-label",
      hasValue
        ? `${province}，${metric}${fmt(value, digits)}${unit}`
        : `${province}，暂无数据`,
    );
    const title = path.querySelector("title");
    if (title) title.textContent = hasValue ? `${province} · ${fmt(value, digits)} ${unit}` : `${province} · 暂无数据`;
  });
  applyMapSelection();
  restoreFilteredMapLabels();
}

function renderSummary(rows) {
  const cycle = cycleRows(rows);
  const day = cycle.find((row) => row.market === "日前");
  const real = cycle.find((row) => row.market === "实时");
  els.dayAvg.textContent = fmt(day?.weightedAvg);
  els.realAvg.textContent = fmt(real?.weightedAvg);
  els.monthCount.textContent = new Set(rows.map((row) => row.month)).size.toString();
  els.volumeTotal.textContent = fmt(rows.reduce((sum, row) => sum + row.volume, 0), 0);
}

function strokeSmoothValues(ctx, values, xAt, yAt) {
  let segment = [];
  const strokeSegment = () => {
    if (!segment.length) return;
    ctx.beginPath();
    ctx.moveTo(segment[0].x, segment[0].y);
    for (let index = 1; index < segment.length; index += 1) {
      const previous = segment[index - 1];
      const current = segment[index];
      const controlX = (previous.x + current.x) / 2;
      ctx.bezierCurveTo(controlX, previous.y, controlX, current.y, current.x, current.y);
    }
    ctx.stroke();
    segment = [];
  };
  values.forEach((value, index) => {
    if (value === null) {
      strokeSegment();
      return;
    }
    segment.push({ x: xAt(index), y: yAt(value) });
  });
  strokeSegment();
}

function smoothSeriesHitSegments(item, xAt, yAt) {
  const hits = [];
  for (let index = 1; index < item.values.length; index += 1) {
    const previousValue = item.values[index - 1];
    const currentValue = item.values[index];
    if (previousValue === null || currentValue === null) continue;
    const x1 = xAt(index - 1);
    const y1 = yAt(previousValue);
    const x2 = xAt(index);
    const y2 = yAt(currentValue);
    const controlX = (x1 + x2) / 2;
    let previousPoint = { x: x1, y: y1 };
    for (let sample = 1; sample <= 10; sample += 1) {
      const t = sample / 10;
      const inverse = 1 - t;
      const point = {
        x: inverse ** 3 * x1 + 3 * inverse ** 2 * t * controlX + 3 * inverse * t ** 2 * controlX + t ** 3 * x2,
        y: inverse ** 3 * y1 + 3 * inverse ** 2 * t * y1 + 3 * inverse * t ** 2 * y2 + t ** 3 * y2,
      };
      hits.push({
        type: "segment",
        x1: previousPoint.x,
        y1: previousPoint.y,
        x2: point.x,
        y2: point.y,
        radius: 5,
        label: item.province,
        contextLabel: true,
      });
      previousPoint = point;
    }
  }
  return hits;
}

function renderChart(rows) {
  const months = [...new Set(rows.map((row) => row.month))].sort();
  const canvas = els.chart;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia("(max-width: 620px)").matches;
  canvas.width = isMobile ? Math.max(1, Math.floor(rect.width * dpr)) : Math.max(640, Math.floor(rect.width * dpr));
  canvas.height = Math.max(260, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  const allSeries = marketOrder.map((market) => ({
    market,
    color: market === "日前" ? "#0f766e" : "#2563eb",
    values: months.map((month) => {
      const row = rows.find((item) => item.month === month && item.market === market);
      return row ? Number(row.weightedAvg) : null;
    }),
  }));
  renderToggleLegend(
    els.provinceTrendLegend,
    allSeries.map((item) => ({ name: item.market, color: item.color })),
    state.hiddenProvinceSeries,
    renderProvince,
  );
  const series = allSeries.filter((item) => !state.hiddenProvinceSeries.has(item.market));
  const values = series.flatMap((item) => item.values).filter((value) => value !== null);
  if (!months.length || !values.length) {
    ctx.fillStyle = themeColor("--chart-label");
    ctx.font = "14px Microsoft YaHei, Segoe UI, sans-serif";
    ctx.fillText("当前筛选条件没有可绘制数据", 24, 48);
    registerChartHits(canvas, [], width, height);
    return;
  }

  const pad = isMobile
    ? { left: 44, right: 42, top: 36, bottom: 50 }
    : { left: 64, right: 36, top: 42, bottom: 46 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;
  const yMin = Math.max(0, minValue - span * 0.12);
  const yMax = maxValue + span * 0.12;
  const xAt = (index) => pad.left + (months.length === 1 ? chartW / 2 : (chartW * index) / (months.length - 1));
  const yAt = (value) => pad.top + chartH - ((value - yMin) / (yMax - yMin)) * chartH;

  ctx.strokeStyle = themeColor("--chart-grid");
  ctx.lineWidth = 1;
  ctx.fillStyle = themeColor("--chart-label");
  ctx.font = `${isMobile ? 12 : 12}px Microsoft YaHei, Segoe UI, sans-serif`;
  ctx.textAlign = "left";
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (chartH * i) / 4;
    const value = yMax - ((yMax - yMin) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(fmt(value, 0), 12, y + 4);
  }
  months.forEach((month, index) => {
    const x = xAt(index);
    ctx.textAlign = "center";
    ctx.fillText(month, x, height - 18);
  });
  ctx.textAlign = "left";

  series.forEach((item) => {
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = 2;
    strokeSmoothValues(ctx, item.values, xAt, yAt);
    item.values.forEach((value, index) => {
      if (value === null) return;
      const x = xAt(index);
      const y = yAt(value);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  const hits = months.map((month, monthIndex) => {
    const available = series
      .map((item) => ({ item, value: item.values[monthIndex] }))
      .filter(({ value }) => value !== null);
    const halfStep = months.length > 1 ? chartW / (months.length - 1) / 2 : chartW / 2;
    return {
      type: "rect",
      x1: Math.max(pad.left, xAt(monthIndex) - halfStep),
      x2: Math.min(width - pad.right, xAt(monthIndex) + halfStep),
      y1: pad.top,
      y2: pad.top + chartH,
      axisX: xAt(monthIndex),
      axisTop: pad.top,
      axisBottom: pad.top + chartH,
      tooltipTitle: month,
      tooltipRows: available.map(({ item, value }) => ({
        color: item.color,
        name: item.market,
        value: `${fmt(value)} 元/MWh`,
      })),
      points: available.map(({ item, value }) => ({
        x: xAt(monthIndex),
        y: yAt(value),
        color: item.color,
      })),
    };
  });
  registerChartHits(canvas, hits, width, height);
}

function ensureBarNavigator(canvas, total, visibleCount, redraw) {
  let navigator = canvas.parentElement.querySelector(`[data-bar-navigator="${canvas.id}"]`);
  if (!navigator) {
    navigator = document.createElement("div");
    navigator.className = "bar-axis-navigator";
    navigator.dataset.barNavigator = canvas.id;
    navigator.innerHTML = `
      <span>拖动查看省份</span>
      <input type="range" min="0" max="0" value="0" aria-label="拖动查看柱状图省份" />
      <output></output>`;
    canvas.insertAdjacentElement("afterend", navigator);
    navigator.querySelector("input").addEventListener("input", (event) => {
      barChartOffsets.set(canvas, Number(event.currentTarget.value));
      navigator.redraw?.();
    });
  }
  navigator.redraw = redraw;
  const maxOffset = Math.max(0, total - visibleCount);
  const offset = Math.min(barChartOffsets.get(canvas) || 0, maxOffset);
  barChartOffsets.set(canvas, offset);
  const input = navigator.querySelector("input");
  input.max = String(maxOffset);
  input.value = String(offset);
  navigator.querySelector("output").textContent = `${total ? offset + 1 : 0}–${Math.min(total, offset + visibleCount)} / ${total}`;
  navigator.hidden = maxOffset === 0;
  return offset;
}

function drawBarChart(canvas, rows, color) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia("(max-width: 620px)").matches;
  canvas.width = isMobile ? Math.max(1, Math.floor(rect.width * dpr)) : Math.max(640, Math.floor(rect.width * dpr));
  canvas.height = Math.max(260, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);
  if (!rows.length) {
    ctx.fillStyle = themeColor("--chart-label");
    ctx.font = "14px Microsoft YaHei, Segoe UI, sans-serif";
    ctx.fillText("当前周期没有可展示省份", 20, 42);
    registerChartHits(canvas, [], width, height);
    ensureBarNavigator(canvas, 0, 0, () => drawBarChart(canvas, rows, color));
    return;
  }
  const visibleCount = isMobile ? Math.min(7, rows.length) : rows.length;
  const offset = ensureBarNavigator(canvas, rows.length, visibleCount, () => drawBarChart(canvas, rows, color));
  const topRows = rows.slice(offset, offset + visibleCount);
  const max = Math.max(...topRows.map((row) => row.weightedAvg || 0), 1);
  const pad = isMobile
    ? { left: 42, right: 8, top: 20, bottom: 58 }
    : { left: 52, right: 16, top: 22, bottom: 58 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const gap = isMobile ? 6 : 8;
  const barW = Math.max(14, (chartW - 2 - gap * (topRows.length - 1)) / topRows.length);
  ctx.strokeStyle = themeColor("--chart-grid");
  ctx.fillStyle = themeColor("--chart-label");
  ctx.font = `${isMobile ? "500 13px" : "12px"} Microsoft YaHei, Segoe UI, sans-serif`;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (chartH * i) / 4;
    const value = max - (max * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(fmt(value, 0), 8, y + 4);
  }
  const hits = [];
  topRows.forEach((row, index) => {
    const value = row.weightedAvg || 0;
    const h = (value / max) * chartH;
    const x = pad.left + 2 + index * (barW + gap);
    const y = pad.top + chartH - h;
    const palette = color === "#0f766e"
      ? ["#5bd4c1", "#149785", "#087166"]
      : ["#78b7ff", "#2f80ed", "#175dcc"];
    const gradient = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.55, palette[1]);
    gradient.addColorStop(1, palette[2]);
    const radius = Math.min(5, barW / 2, h);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, pad.top + chartH);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barW - radius, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
    ctx.lineTo(x + barW, pad.top + chartH);
    ctx.closePath();
    ctx.fill();
    hits.push({
      type: "rect",
      x1: x,
      y1: y,
      x2: x + barW,
      y2: pad.top + chartH,
      tooltipTitle: row.province,
      tooltipRows: [
        { color: palette[1], name: "加权均价", value: `${fmt(row.weightedAvg)} 元/MWh` },
        { color: "#94a3b8", name: "权重合计", value: fmt(row.volume, 0) },
        { color: "#cbd5e1", name: "样本点", value: fmt(row.points, 0) },
      ],
    });
    ctx.fillStyle = themeColor("--chart-text");
    ctx.save();
    ctx.translate(x + barW / 2 - 4, height - 18);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(row.province, 0, 0);
    ctx.restore();
  });
  registerChartHits(canvas, hits, width, height);
}

function colorForIndex(index) {
  const palette = ["#0f766e", "#2563eb", "#b45309", "#7c3aed", "#dc2626", "#0891b2", "#65a30d", "#c2410c", "#4f46e5", "#be185d", "#047857", "#9333ea"];
  return palette[index % palette.length];
}

function nationalTrendSeries(market) {
  const start = els.nationalStart.value;
  const end = els.nationalEnd.value;
  const months = [...new Set(state.data.monthly
    .filter((row) => row.month >= start && row.month <= end)
    .map((row) => row.month))].sort();
  const allSeries = state.data.provinces.map((item, index) => {
    const rows = state.data.monthly.filter((row) =>
      row.province === item.name
      && row.market === market
      && row.month >= start
      && row.month <= end
    );
    return {
      province: item.name,
      color: colorForIndex(index),
      values: months.map((month) => rows.find((row) => row.month === month)?.weightedAvg ?? null),
    };
  });
  return { months, allSeries };
}

function renderNationalTrendSelector(allSeries) {
  const query = state.trendSearch.trim().toLocaleLowerCase("zh-CN");
  const visibleItems = allSeries.filter((item) => !query || item.province.toLocaleLowerCase("zh-CN").includes(query));
  const focusedNames = [...state.focusedNationalSeries];
  els.nationalTrendSelector.innerHTML = visibleItems.map((item) => {
    const latest = [...item.values].reverse().find((value) => value !== null);
    const checked = state.focusedNationalSeries.has(item.province);
    const focusIndex = focusedNames.indexOf(item.province);
    const color = checked ? FOCUS_COLORS[focusIndex % FOCUS_COLORS.length] : "#a9b5c1";
    return `
      <label class="focus-province-item${checked ? " is-focused" : ""}">
        <input type="checkbox" value="${escapeHtml(item.province)}" ${checked ? "checked" : ""} />
        <i style="background:${color}"></i>
        <span>${escapeHtml(item.province)}</span>
        <strong>${fmt(latest)}</strong>
      </label>
    `;
  }).join("") || `<p class="empty legend-empty">未找到匹配省份</p>`;
  els.nationalTrendSelector.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.focusedNationalSeries.add(input.value);
      else state.focusedNationalSeries.delete(input.value);
      renderNationalTrend();
    });
  });
}

function syncTrendRangeControls() {
  const months = [...new Set(state.data.monthly.map((row) => row.month))].sort();
  if (!months.length) return;
  const startIndex = Math.max(0, months.indexOf(els.nationalStart.value));
  const endIndex = Math.max(startIndex, months.indexOf(els.nationalEnd.value));
  [els.trendRangeStart, els.trendRangeEnd].forEach((input) => {
    input.max = String(months.length - 1);
  });
  els.trendRangeStart.value = String(startIndex);
  els.trendRangeEnd.value = String(endIndex);
  els.trendRangeStartLabel.textContent = months[startIndex];
  els.trendRangeEndLabel.textContent = months[endIndex];
}

function applyTrendRange() {
  const months = [...new Set(state.data.monthly.map((row) => row.month))].sort();
  if (!months.length) return;
  let startIndex = Number(els.trendRangeStart.value);
  let endIndex = Number(els.trendRangeEnd.value);
  if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];
  els.nationalStart.value = months[startIndex];
  els.nationalEnd.value = months[endIndex];
  renderNationalModule();
}

function drawMultiProvinceTrend(canvas, market) {
  const { months, allSeries } = nationalTrendSeries(market);
  const drawableSeries = allSeries.filter((item) => item.values.some((value) => value !== null));
  renderNationalTrendSelector(allSeries);

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia("(max-width: 620px)").matches;
  canvas.width = isMobile ? Math.max(1, Math.floor(rect.width * dpr)) : Math.max(900, Math.floor(rect.width * dpr));
  canvas.height = Math.max(300, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  const values = drawableSeries.flatMap((item) => item.values).filter((value) => value !== null);
  if (!months.length || !values.length) {
    ctx.fillStyle = themeColor("--chart-label");
    ctx.font = "14px Microsoft YaHei, Segoe UI, sans-serif";
    ctx.fillText("当前周期没有可绘制数据", 24, 48);
    registerChartHits(canvas, [], width, height);
    return;
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;
  const yMin = Math.max(0, minValue - span * 0.12);
  const yMax = maxValue + span * 0.12;
  const pad = isMobile
    ? { left: 44, right: 52, top: 28, bottom: 48 }
    : { left: 62, right: 76, top: 28, bottom: 48 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xAt = (index) => pad.left + (months.length === 1 ? chartW / 2 : (chartW * index) / (months.length - 1));
  const yAt = (value) => pad.top + chartH - ((value - yMin) / (yMax - yMin)) * chartH;

  ctx.strokeStyle = themeColor("--chart-grid");
  ctx.lineWidth = 1;
  ctx.fillStyle = themeColor("--chart-label");
  ctx.font = `${isMobile ? 11 : 12}px Microsoft YaHei, Segoe UI, sans-serif`;
  ctx.textAlign = "left";
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (chartH * i) / 4;
    const value = yMax - ((yMax - yMin) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(fmt(value, 0), 12, y + 4);
  }
  months.forEach((month, index) => {
    if (isMobile && index % 2 !== 0 && index !== months.length - 1) return;
    const x = xAt(index);
    ctx.textAlign = "center";
    ctx.fillText(month, x, height - 18);
  });
  ctx.textAlign = "left";

  const focused = [...state.focusedNationalSeries]
    .map((province) => drawableSeries.find((item) => item.province === province))
    .filter(Boolean);
  focused.forEach((item, index) => { item.focusColor = FOCUS_COLORS[index % FOCUS_COLORS.length]; });
  const context = state.showTrendContext
    ? drawableSeries.filter((item) => !state.focusedNationalSeries.has(item.province))
    : [];

  const drawSeries = (item, isFocused) => {
    ctx.strokeStyle = isFocused ? item.focusColor : themeColor("--chart-context");
    ctx.fillStyle = isFocused ? item.focusColor : themeColor("--chart-context-fill");
    ctx.lineWidth = isFocused ? 2.4 : 1;
    strokeSmoothValues(ctx, item.values, xAt, yAt);
    if (!isFocused) return;
    item.values.forEach((value, monthIndex) => {
      if (value === null) return;
      const x = xAt(monthIndex);
      const y = yAt(value);
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  context.forEach((item) => drawSeries(item, false));
  focused.forEach((item) => drawSeries(item, true));

  const endLabels = focused
    .map((item) => {
      const latestIndex = item.values.reduce((found, value, index) => value !== null ? index : found, -1);
      if (latestIndex < 0) return null;
      return {
        item,
        x: xAt(latestIndex),
        sourceY: yAt(item.values[latestIndex]),
        y: yAt(item.values[latestIndex]),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  const labelGap = 15;
  endLabels.forEach((label, index) => {
    if (index > 0) label.y = Math.max(label.y, endLabels[index - 1].y + labelGap);
  });
  const overflow = endLabels.length ? endLabels[endLabels.length - 1].y - (pad.top + chartH - 5) : 0;
  if (overflow > 0) endLabels.forEach((label) => { label.y -= overflow; });
  ctx.font = "600 11px Microsoft YaHei, Segoe UI, sans-serif";
  endLabels.forEach((label) => {
    const textX = Math.min(width - 48, label.x + 9);
    ctx.strokeStyle = label.item.focusColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(label.x + 3, label.sourceY);
    ctx.lineTo(textX - 2, label.y);
    ctx.stroke();
    ctx.fillStyle = label.item.focusColor;
    ctx.fillText(label.item.province, textX, label.y + 4);
  });

  const contextHits = context.flatMap((item) => smoothSeriesHitSegments(item, xAt, yAt));
  const axisHits = months.map((month, monthIndex) => {
    const compared = focused
      .map((item) => ({ province: item.province, value: item.values[monthIndex], color: item.focusColor }))
      .filter((item) => item.value !== null)
      .sort((a, b) => b.value - a.value);
    const halfStep = months.length > 1 ? chartW / (months.length - 1) / 2 : chartW / 2;
    return {
      type: "rect",
      x1: Math.max(pad.left, xAt(monthIndex) - halfStep),
      x2: Math.min(width - pad.right, xAt(monthIndex) + halfStep),
      y1: pad.top,
      y2: pad.top + chartH,
      axisX: xAt(monthIndex),
      axisTop: pad.top,
      axisBottom: pad.top + chartH,
      tooltipTitle: month,
      tooltipRows: compared.length
        ? compared.map((item) => ({ color: item.color, name: item.province, value: `${fmt(item.value)} 元/MWh` }))
        : [{ color: "#94a3b8", name: "提示", value: "未选择重点省份" }],
      points: compared.map((item) => ({
        x: xAt(monthIndex),
        y: yAt(item.value),
        color: item.color,
      })),
    };
  });
  registerChartHits(canvas, [...contextHits, ...axisHits], width, height);
}

function renderNationalTrend() {
  const market = state.nationalTrendMarket;
  els.nationalTrendTitle.textContent = `各省${market}光伏加权均价走势`;
  els.nationalTrendPeriod.textContent = `${els.nationalStart.value} 至 ${els.nationalEnd.value}`;
  els.nationalTrendChart.setAttribute("aria-label", `各省${market}光伏加权均价走势`);
  els.trendMarketButtons.forEach((button) => {
    const active = button.dataset.trendMarket === market;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  els.toggleTrendContext.classList.toggle("is-active", !state.showTrendContext);
  els.toggleTrendContext.setAttribute("aria-pressed", state.showTrendContext ? "false" : "true");
  els.toggleTrendContext.textContent = state.showTrendContext ? "仅看所选" : "显示全部背景";
  syncTrendRangeControls();
  drawMultiProvinceTrend(els.nationalTrendChart, market);
}

function provinceDisplayName(name) {
  const specialNames = {
    北京: "北京市",
    天津: "天津市",
    上海: "上海市",
    重庆: "重庆市",
    内蒙古: "内蒙古自治区",
    广西: "广西壮族自治区",
    宁夏: "宁夏回族自治区",
    新疆: "新疆维吾尔自治区",
    西藏: "西藏自治区",
    冀南: "冀南",
    蒙东: "蒙东",
  };
  return specialNames[name] || `${name}省`;
}

function updateProvinceLabels() {
  const displayName = provinceDisplayName(els.province.value);
  els.provinceLabels.forEach((element) => {
    element.textContent = `${displayName}${element.dataset.provinceLabel}`;
  });
  els.exportProvince.textContent = `导出${displayName}逐月明细`;
  els.chart.setAttribute("aria-label", `${displayName}现货加权均价走势`);
}

function renderResults(rows) {
  const tableRows = els.mode.value === "monthly" ? rows : cycleRows(rows);
  els.resultRows.innerHTML = tableRows.map((row) => `
    <tr>
      <td>${row.month || row.period}</td>
      <td>${row.market}</td>
      <td>${fmt(row.weightedAvg)}</td>
      <td>${fmt(row.volume, 0)}</td>
      <td>${row.points || row.months}</td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="empty">当前筛选条件没有可计算结果</td></tr>`;
}

function renderOverviewSummary(dayRows, realRows) {
  const start = els.nationalStart.value;
  const end = els.nationalEnd.value;
  const rows = state.data.monthly.filter((row) => row.month >= start && row.month <= end);
  const day = weightedCycle(rows, "日前", "全国", start, end);
  const real = weightedCycle(rows, "实时", "全国", start, end);
  const top = realRows[0];
  const low = realRows[realRows.length - 1];
  els.overviewPeriod.textContent = `${start} 至 ${end}`;
  els.overviewDayAvg.textContent = fmt(day.weightedAvg);
  els.overviewRealAvg.textContent = fmt(real.weightedAvg);
  els.overviewTopValue.textContent = fmt(top?.weightedAvg);
  els.overviewTopProvince.textContent = top?.province || "--";
  els.overviewLowValue.textContent = fmt(low?.weightedAvg);
  els.overviewLowProvince.textContent = low?.province || "--";
}

function renderNational() {
  const dayRows = nationalRows("日前");
  const realRows = nationalRows("实时");
  els.nationalDayHint.textContent = `${els.nationalStart.value} 至 ${els.nationalEnd.value}`;
  els.nationalRealHint.textContent = `${els.nationalStart.value} 至 ${els.nationalEnd.value}`;
  drawBarChart(els.nationalDayChart, dayRows, "#0f766e");
  drawBarChart(els.nationalRealChart, realRows, "#2563eb");
  renderOverviewSummary(dayRows, realRows);
  renderNationalTrend();
  const rowHtml = (rows) => rows.map((row) => `
    <tr>
      <td>${row.province}</td>
      <td>${fmt(row.weightedAvg)}</td>
      <td>${fmt(row.volume, 0)}</td>
      <td>${row.points}</td>
    </tr>
  `).join("") || `<tr><td colspan="4" class="empty">当前周期没有可计算结果</td></tr>`;
  els.nationalDayRows.innerHTML = rowHtml(dayRows);
  els.nationalRealRows.innerHTML = rowHtml(realRows);
}

function parameterDisplay(value, header) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value !== "number") return escapeHtml(value).replaceAll("\n", "<br>");
  if (header.includes("执行比例")) return `${fmt(value * 100, 1)}%`;
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 6 });
}

function compareParameterValues(a, b, direction) {
  const aMissing = a === null || a === undefined || a === "";
  const bMissing = b === null || b === undefined || b === "";
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : (aMissing ? 1 : -1);
  const comparison = typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), "zh-CN", { numeric: true });
  return direction === "asc" ? comparison : -comparison;
}

function renderParameterTable(key, head, body) {
  const table = state.data.parameterTables?.[key];
  if (!table) {
    head.innerHTML = "";
    body.innerHTML = `<tr><td class="empty">暂无参数数据</td></tr>`;
    return;
  }
  head.closest("table").style.setProperty("--parameter-columns", table.headers.length);
  const sort = state.parameterSort[key];
  const rows = [...table.rows];
  if (sort) rows.sort((a, b) => compareParameterValues(a[sort.index], b[sort.index], sort.direction));
  head.innerHTML = `<tr>${table.headers.map((header, index) => {
    const active = sort?.index === index;
    const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
    return `<th aria-sort="${ariaSort}"><button class="parameter-sort" type="button" data-parameter-table="${key}" data-sort-index="${index}">
      <span>${escapeHtml(header).replaceAll("\n", "<br>")}</span><span class="sort-mark" aria-hidden="true">${active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button></th>`;
  }).join("")}</tr>`;
  body.innerHTML = rows.map((row) => `<tr>${table.headers.map((header, index) => `<td>${parameterDisplay(row[index], header)}</td>`).join("")}</tr>`).join("");
}

function renderParamTables() {
  renderParameterTable("disclosure", els.disclosureHead, els.disclosureRows);
  renderParameterTable("settlement", els.settlementHead, els.settlementRows);
  renderParameterTable("mechanism", els.mechanismHead, els.mechanismRows);
}

function renderProvince() {
  if (els.provinceStart.value > els.provinceEnd.value) {
    els.provinceEnd.value = els.provinceStart.value;
  }
  updateProvinceLabels();
  const rows = selectedRows();
  renderSummary(rows);
  renderChart(rows);
  renderResults(rows);
}

function renderNationalModule() {
  if (els.nationalStart.value > els.nationalEnd.value) {
    els.nationalEnd.value = els.nationalStart.value;
  }
  renderNational();
  renderParamTables();
  renderHeatmap();
}

function render() {
  renderNationalModule();
  renderProvince();
}

function exportMonth(month) {
  return month ? String(month).replace("-", "") : "";
}

function downloadRows(rows, filename, sheetName) {
  if (!window.XLSX) {
    window.alert("Excel 导出组件加载失败，请刷新页面后重试。");
    return;
  }

  const payload = rows.map((row) => ({
    省份: row.province || els.province.value,
    月份: exportMonth(row.month || row.period),
    市场: row.market,
    光伏现货加权均价_元每MWh: row.weightedAvg,
    权重合计: row.volume,
    样本点: row.points || row.months,
  }));
  const headers = ["省份", "月份", "市场", "光伏现货加权均价_元每MWh", "权重合计", "样本点"];
  const worksheet = window.XLSX.utils.aoa_to_sheet([
    headers,
    ...payload.map((row) => headers.map((header) => row[header] ?? "")),
  ]);

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 30 },
    { wch: 18 },
    { wch: 12 },
  ];
  worksheet["!autofilter"] = { ref: `A1:F${Math.max(payload.length + 1, 1)}` };
  for (let rowNumber = 2; rowNumber <= payload.length + 1; rowNumber += 1) {
    const monthCell = worksheet[`B${rowNumber}`];
    if (monthCell) {
      monthCell.t = "s";
      monthCell.v = String(monthCell.v);
      monthCell.z = "@";
    }
  }

  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  window.XLSX.writeFile(workbook, filename, { bookType: "xlsx", compression: true });
}

function exportNationalRows() {
  const start = els.nationalStart.value;
  const end = els.nationalEnd.value;
  const rows = state.data.monthly
    .filter((row) => row.month >= start && row.month <= end)
    .sort((a, b) => a.province.localeCompare(b.province, "zh-CN")
      || a.month.localeCompare(b.month)
      || marketOrder.indexOf(a.market) - marketOrder.indexOf(b.market));
  downloadRows(rows, `全国_${start}_${end}_各省逐月明细.xlsx`, "全国逐月明细");
}

function exportProvinceRows() {
  const start = els.provinceStart.value;
  const end = els.provinceEnd.value;
  downloadRows(
    selectedRows(),
    `${els.province.value}_${start}_${end}_逐月明细.xlsx`,
    `${els.province.value}逐月明细`,
  );
}

async function init() {
  applyTheme(state.theme, false);
  if (window.DASHBOARD_DATA) {
    state.data = window.DASHBOARD_DATA;
  } else {
    const response = await fetch("./public/data/dashboard-data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
  }
  els.stamp.textContent = "";
  els.stamp.hidden = true;
  fillSelect(els.province, state.data.provinces.map((p) => p.name));
  if (state.data.capacity?.types?.length) {
    fillSelect(els.mapCapacity, state.data.capacity.types);
    els.mapCapacity.value = state.data.capacity.types.includes("光伏") ? "光伏" : state.data.capacity.types[0];
  }
  updateNationalMonths(false);
  updateProvinceMonths(false);
  state.focusedNationalSeries = new Set(["广东", "福建", "重庆", "山西"]
    .filter((province) => state.data.provinces.some((item) => item.name === province)));
  initNavigation();
  try {
    await loadMap();
  } catch (error) {
    els.mapHost.textContent = `地图加载失败：${error.message}`;
  }
  initHeatLegendInteraction();
  render();
  requestAnimationFrame(() => requestAnimationFrame(focusDefaultNationalMap));
  window.setTimeout(focusDefaultNationalMap, 160);
  els.province.addEventListener("change", () => {
    updateProvinceMonths(false);
    renderProvince();
  });
  els.mode.addEventListener("change", renderProvince);
  [els.provinceStart, els.provinceEnd].forEach((el) => el.addEventListener("change", renderProvince));
  [els.nationalStart, els.nationalEnd].forEach((el) => el.addEventListener("change", renderNationalModule));
  els.mapModeButtons.forEach((button) => button.addEventListener("click", () => setMapMode(button.dataset.mapMode)));
  [els.mapMarket, els.mapCapacity].forEach((control) => control.addEventListener("change", () => {
    state.heatRange = [0, 100];
    renderHeatmap();
  }));
  els.trendMarketButtons.forEach((button) => button.addEventListener("click", () => {
    state.nationalTrendMarket = button.dataset.trendMarket;
    renderNationalTrend();
  }));
  els.nationalTrendSearch.addEventListener("input", () => {
    state.trendSearch = els.nationalTrendSearch.value;
    renderNationalTrendSelector(nationalTrendSeries(state.nationalTrendMarket).allSeries);
  });
  els.focusAllProvinces.addEventListener("click", () => {
    state.focusedNationalSeries = new Set(state.data.provinces.map((item) => item.name));
    renderNationalTrend();
  });
  els.clearFocusedProvinces.addEventListener("click", () => {
    state.focusedNationalSeries.clear();
    renderNationalTrend();
  });
  els.toggleTrendContext.addEventListener("click", () => {
    state.showTrendContext = !state.showTrendContext;
    renderNationalTrend();
  });
  [els.trendRangeStart, els.trendRangeEnd].forEach((input) => input.addEventListener("change", applyTrendRange));
  els.exportProvince.addEventListener("click", exportProvinceRows);
  els.exportNational.addEventListener("click", exportNationalRows);
  els.themeToggle.addEventListener("click", () => applyTheme(state.theme === "dark" ? "light" : "dark"));
  els.priceParams.addEventListener("click", (event) => {
    const button = event.target.closest("[data-parameter-table]");
    if (!button) return;
    const key = button.dataset.parameterTable;
    const index = Number(button.dataset.sortIndex);
    const current = state.parameterSort[key];
    state.parameterSort[key] = {
      index,
      direction: current?.index === index && current.direction === "asc" ? "desc" : "asc",
    };
    renderParamTables();
  });
  window.addEventListener("resize", render);
}

init().catch((error) => {
  els.stamp.textContent = `数据加载失败：${error.message}`;
  els.stamp.hidden = false;
});
