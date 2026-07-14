const state = {
  data: null,
  hiddenNationalSeries: {
    日前: new Set(),
    实时: new Set(),
  },
  hiddenProvinceSeries: new Set(),
};

const NATIONAL_DEFAULT_START = "2025-06";
const NATIONAL_DEFAULT_END = "2026-06";
const PROVINCE_DEFAULT_START = "2026-01";
const PROVINCE_DEFAULT_END = "2026-06";
const chartHits = new WeakMap();

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
  nationalDayTrendChart: document.querySelector("#nationalDayTrendChart"),
  nationalRealTrendChart: document.querySelector("#nationalRealTrendChart"),
  nationalDayLegend: document.querySelector("#nationalDayLegend"),
  nationalRealLegend: document.querySelector("#nationalRealLegend"),
  provinceTrendLegend: document.querySelector("#provinceTrendLegend"),
  nationalDayRows: document.querySelector("#nationalDayRows"),
  nationalRealRows: document.querySelector("#nationalRealRows"),
  nationalDayHint: document.querySelector("#nationalDayHint"),
  nationalRealHint: document.querySelector("#nationalRealHint"),
  coalRows: document.querySelector("#coalRows"),
  mechanismHead: document.querySelector("#mechanismHead"),
  mechanismRows: document.querySelector("#mechanismRows"),
  settlementHead: document.querySelector("#settlementHead"),
  settlementRows: document.querySelector("#settlementRows"),
  exportProvince: document.querySelector("#exportProvince"),
  exportNational: document.querySelector("#exportNational"),
  provinceLabels: document.querySelectorAll("[data-province-label]"),
  navLinks: document.querySelectorAll(".dashboard-nav a"),
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

function setActiveNavigation(targetId) {
  els.navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${targetId}`);
  });
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

function registerChartHits(canvas, hits, width, height) {
  chartHits.set(canvas, { hits, width, height });
  if (canvas.dataset.interactive === "true") return;
  canvas.dataset.interactive = "true";
  const tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.hidden = true;
  canvas.parentElement.appendChild(tooltip);

  canvas.addEventListener("mousemove", (event) => {
    const meta = chartHits.get(canvas);
    if (!meta) return;
    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    const x = cssX * (meta.width / rect.width);
    const y = cssY * (meta.height / rect.height);
    const hit = meta.hits.find((item) => item.type === "rect"
      ? x >= item.x1 && x <= item.x2 && y >= item.y1 && y <= item.y2
      : Math.hypot(x - item.x, y - item.y) <= (item.radius || 8));
    if (!hit) {
      tooltip.hidden = true;
      canvas.style.cursor = "default";
      return;
    }
    tooltip.textContent = hit.label;
    tooltip.hidden = false;
    const parent = canvas.parentElement;
    const preferredLeft = canvas.offsetLeft + cssX + 12;
    const preferredTop = canvas.offsetTop + cssY + 12;
    const maxLeft = Math.max(8, parent.clientWidth - tooltip.offsetWidth - 8);
    const maxTop = Math.max(8, parent.clientHeight - tooltip.offsetHeight - 8);
    tooltip.style.left = `${Math.min(Math.max(8, preferredLeft), maxLeft)}px`;
    tooltip.style.top = `${Math.min(Math.max(8, preferredTop), maxTop)}px`;
    canvas.style.cursor = "crosshair";
  });
  canvas.addEventListener("mouseleave", () => {
    tooltip.hidden = true;
    canvas.style.cursor = "default";
  });
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

function renderSummary(rows) {
  const cycle = cycleRows(rows);
  const day = cycle.find((row) => row.market === "日前");
  const real = cycle.find((row) => row.market === "实时");
  els.dayAvg.textContent = fmt(day?.weightedAvg);
  els.realAvg.textContent = fmt(real?.weightedAvg);
  els.monthCount.textContent = new Set(rows.map((row) => row.month)).size.toString();
  els.volumeTotal.textContent = fmt(rows.reduce((sum, row) => sum + row.volume, 0), 0);
}

function renderChart(rows) {
  const months = [...new Set(rows.map((row) => row.month))].sort();
  const canvas = els.chart;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(640, Math.floor(rect.width * dpr));
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
    ctx.fillStyle = "#657383";
    ctx.font = "14px Microsoft YaHei, Segoe UI, sans-serif";
    ctx.fillText("当前筛选条件没有可绘制数据", 24, 48);
    registerChartHits(canvas, [], width, height);
    return;
  }

  const pad = { left: 64, right: 24, top: 42, bottom: 46 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;
  const yMin = Math.max(0, minValue - span * 0.12);
  const yMax = maxValue + span * 0.12;
  const xAt = (index) => pad.left + (months.length === 1 ? chartW / 2 : (chartW * index) / (months.length - 1));
  const yAt = (value) => pad.top + chartH - ((value - yMin) / (yMax - yMin)) * chartH;

  ctx.strokeStyle = "#dce3ea";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#657383";
  ctx.font = "12px Microsoft YaHei, Segoe UI, sans-serif";
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
    ctx.fillText(month, x - 20, height - 18);
  });

  const hits = [];
  series.forEach((item) => {
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    item.values.forEach((value, index) => {
      if (value === null) return;
      const x = xAt(index);
      const y = yAt(value);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    item.values.forEach((value, index) => {
      if (value === null) return;
      const x = xAt(index);
      const y = yAt(value);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      hits.push({
        type: "point",
        x,
        y,
        radius: 9,
        label: `${item.market} · ${months[index]} · ${fmt(value)} 元/MWh`,
      });
    });
  });
  registerChartHits(canvas, hits, width, height);
}

function drawBarChart(canvas, rows, color) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(640, Math.floor(rect.width * dpr));
  canvas.height = Math.max(260, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);
  if (!rows.length) {
    ctx.fillStyle = "#657383";
    ctx.font = "14px Microsoft YaHei, Segoe UI, sans-serif";
    ctx.fillText("当前周期没有可展示省份", 20, 42);
    registerChartHits(canvas, [], width, height);
    return;
  }
  const topRows = rows;
  const max = Math.max(...topRows.map((row) => row.weightedAvg || 0), 1);
  const pad = { left: 54, right: 20, top: 22, bottom: 58 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const gap = 8;
  const barW = Math.max(14, (chartW - gap * (topRows.length - 1)) / topRows.length);
  ctx.strokeStyle = "#dce3ea";
  ctx.fillStyle = "#657383";
  ctx.font = "12px Microsoft YaHei, Segoe UI, sans-serif";
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
    const x = pad.left + index * (barW + gap);
    const y = pad.top + chartH - h;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW, h);
    hits.push({
      type: "rect",
      x1: x,
      y1: y,
      x2: x + barW,
      y2: pad.top + chartH,
      label: `${row.province} · ${fmt(row.weightedAvg)} 元/MWh · ${fmt(row.volume, 0)} 权重`,
    });
    ctx.fillStyle = "#1b232c";
    ctx.save();
    ctx.translate(x + barW / 2 - 4, height - 18);
    ctx.rotate(-Math.PI / 5);
    ctx.fillText(row.province, 0, 0);
    ctx.restore();
  });
  registerChartHits(canvas, hits, width, height);
}

function colorForIndex(index) {
  const palette = ["#0f766e", "#2563eb", "#b45309", "#7c3aed", "#dc2626", "#0891b2", "#65a30d", "#c2410c", "#4f46e5", "#be185d", "#047857", "#9333ea"];
  return palette[index % palette.length];
}

function drawMultiProvinceTrend(canvas, market) {
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
  const legend = market === "日前" ? els.nationalDayLegend : els.nationalRealLegend;
  const hiddenSet = state.hiddenNationalSeries[market];
  renderToggleLegend(
    legend,
    allSeries.map((item) => ({ name: item.province, color: item.color })),
    hiddenSet,
    renderNational,
  );
  const series = allSeries.filter((item) =>
    !hiddenSet.has(item.province) && item.values.some((value) => value !== null)
  );

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(900, Math.floor(rect.width * dpr));
  canvas.height = Math.max(300, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  const values = series.flatMap((item) => item.values).filter((value) => value !== null);
  if (!months.length || !values.length) {
    ctx.fillStyle = "#657383";
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
  const pad = { left: 64, right: 44, top: 34, bottom: 50 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xAt = (index) => pad.left + (months.length === 1 ? chartW / 2 : (chartW * index) / (months.length - 1));
  const yAt = (value) => pad.top + chartH - ((value - yMin) / (yMax - yMin)) * chartH;

  ctx.strokeStyle = "#dce3ea";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#657383";
  ctx.font = "12px Microsoft YaHei, Segoe UI, sans-serif";
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
    ctx.fillText(month, x - 20, height - 18);
  });

  const hits = [];
  series.forEach((item) => {
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.province === els.province.value ? 2.8 : 1.4;
    ctx.beginPath();
    let started = false;
    item.values.forEach((value, monthIndex) => {
      if (value === null) return;
      const x = xAt(monthIndex);
      const y = yAt(value);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    item.values.forEach((value, monthIndex) => {
      if (value === null) return;
      const x = xAt(monthIndex);
      const y = yAt(value);
      ctx.beginPath();
      ctx.arc(x, y, item.province === els.province.value ? 3.8 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      hits.push({
        type: "point",
        x,
        y,
        radius: 8,
        label: `${item.province} · ${months[monthIndex]} · ${fmt(value)} 元/MWh`,
      });
    });
  });
  registerChartHits(canvas, hits, width, height);
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

function renderNational() {
  const dayRows = nationalRows("日前");
  const realRows = nationalRows("实时");
  els.nationalDayHint.textContent = `${els.nationalStart.value} 至 ${els.nationalEnd.value}`;
  els.nationalRealHint.textContent = `${els.nationalStart.value} 至 ${els.nationalEnd.value}`;
  drawBarChart(els.nationalDayChart, dayRows, "#0f766e");
  drawBarChart(els.nationalRealChart, realRows, "#2563eb");
  drawMultiProvinceTrend(els.nationalDayTrendChart, "日前");
  drawMultiProvinceTrend(els.nationalRealTrendChart, "实时");
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

function renderParamTables() {
  const provinces = state.data.provinces.map((item) => item.name);
  const selectedYears = new Set();
  for (let year = Number(els.nationalStart.value.slice(0, 4)); year <= Number(els.nationalEnd.value.slice(0, 4)); year += 1) {
    selectedYears.add(String(year));
  }
  els.coalRows.innerHTML = provinces.map((province) => {
    const params = state.data.params[province];
    return `<tr><td>${province}</td><td>${fmtParameter(params?.coalBenchmark2025, 4)}</td></tr>`;
  }).join("");

  const mechanismYears = [...new Set(Object.values(state.data.params)
    .flatMap((params) => Object.keys(params.mechanism || {})))].sort()
    .filter((year) => selectedYears.has(String(year)));
  els.mechanismHead.innerHTML = `<tr><th>省份</th>${mechanismYears.map((year) => `
    <th>${year}年机制竞价结果<br>（元/kWh）</th>
    <th>${year}年机制竞价增量执行比例</th>
  `).join("")}</tr>`;
  els.mechanismRows.innerHTML = provinces.map((province) => {
    const mechanism = state.data.params[province]?.mechanism || {};
    return `<tr><td>${province}</td>${mechanismYears.map((year) => {
      const item = mechanism[year] || {};
      return `<td>${fmtParameter(item.price, 4)}</td><td>${fmtParameter(item.ratio, 1, true)}</td>`;
    }).join("")}</tr>`;
  }).join("");

  const months = [...new Set(Object.values(state.data.params)
    .flatMap((params) => Object.keys(params.settlement || {})))].sort()
    .filter((month) => month >= els.nationalStart.value && month <= els.nationalEnd.value);
  els.settlementHead.innerHTML = `<tr><th>省份</th>${months.map((month) => `<th>${month}</th>`).join("")}</tr>`;
  els.settlementRows.innerHTML = provinces.map((province) => {
    const settlement = state.data.params[province]?.settlement || {};
    return `<tr><td>${province}</td>${months.map((month) => `<td>${fmtParameter(settlement[month], 5)}</td>`).join("")}</tr>`;
  }).join("");
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
}

function render() {
  renderNationalModule();
  renderProvince();
}

function exportMonth(month) {
  return month ? String(month).replace("-", "") : "";
}

function downloadRows(rows, filename) {
  const payload = rows.map((row) => ({
    省份: row.province || els.province.value,
    月份: exportMonth(row.month || row.period),
    市场: row.market,
    光伏现货加权均价_元每MWh: row.weightedAvg,
    权重合计: row.volume,
    样本点: row.points || row.months,
  }));
  const headers = Object.keys(payload[0] || {
    省份: "",
    月份: "",
    市场: "",
    光伏现货加权均价_元每MWh: "",
    权重合计: "",
    样本点: "",
  });
  const html = `
    <html><head><meta charset="UTF-8"></head><body>
      <table border="1">
        <thead><tr>${headers.map((head) => `<th>${head}</th>`).join("")}</tr></thead>
        <tbody>${payload.map((row) => `<tr>${headers.map((head) => `<td${head === "月份" ? " style=\"mso-number-format:'\\@'\"" : ""}>${row[head] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </body></html>
  `;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportNationalRows() {
  const start = els.nationalStart.value;
  const end = els.nationalEnd.value;
  const rows = state.data.monthly
    .filter((row) => row.month >= start && row.month <= end)
    .sort((a, b) => a.province.localeCompare(b.province, "zh-CN")
      || a.month.localeCompare(b.month)
      || marketOrder.indexOf(a.market) - marketOrder.indexOf(b.market));
  downloadRows(rows, `全国_${start}_${end}_各省逐月明细.xls`);
}

function exportProvinceRows() {
  const start = els.provinceStart.value;
  const end = els.provinceEnd.value;
  downloadRows(selectedRows(), `${els.province.value}_${start}_${end}_逐月明细.xls`);
}

async function init() {
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
  updateNationalMonths(false);
  updateProvinceMonths(false);
  initNavigation();
  render();
  els.province.addEventListener("change", () => {
    updateProvinceMonths(false);
    renderProvince();
  });
  els.mode.addEventListener("change", renderProvince);
  [els.provinceStart, els.provinceEnd].forEach((el) => el.addEventListener("change", renderProvince));
  [els.nationalStart, els.nationalEnd].forEach((el) => el.addEventListener("change", renderNationalModule));
  els.exportProvince.addEventListener("click", exportProvinceRows);
  els.exportNational.addEventListener("click", exportNationalRows);
  window.addEventListener("resize", render);
}

init().catch((error) => {
  els.stamp.textContent = `数据加载失败：${error.message}`;
  els.stamp.hidden = false;
});
