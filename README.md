# 各省光伏电价数据看板

静态网页看板，可部署到 GitHub Pages。网页只读取已经汇总的 JSON/JS，不上传各省原始 Excel、参数维护表或光伏曲线工作簿。

## 数据分层

- `public/data/yearly/2024-2025.json`：2024-2025 历史固化结果，通常只生成一次。
- `public/data/yearly/2026.json`：2026 年月度结果。
- `public/data/yearly/2027.json`：运行 2027 年命令后自动生成，后续年份同理。
- `public/data/dashboard-data.json` 和 `dashboard-data.js`：所有年度缓存的合并结果，网页实际读取这两个文件。
- `.data-cache/`：本地计算缓存及映射元数据，已被 Git 忽略，不会上传。

## 首次固化

首次建立年度缓存，或计算逻辑发生变化时运行：

```powershell
python scripts/build_data.py all --years 2026
```

该命令分别计算 2024-2025 和 2026，再合并网页数据。历史数据固化后不需要每月重复计算。

## 每月更新

将新月份 Excel 放入对应省份目录后，只更新该月。例如新增 2026 年 7 月：

```powershell
python scripts/build_data.py month 2026-07
```

命令只替换 `2026.json` 中的 7 月结果，保留 2026 年其他月份和 2024-2025 历史缓存，然后自动合并网页数据。

若需要重算整个年份：

```powershell
python scripts/build_data.py year 2026
```

## 新增年度

2027 年首次维护时无需修改脚本：

```powershell
python scripts/build_data.py year 2027
```

此后按月更新：

```powershell
python scripts/build_data.py month 2027-01
```

仅重新合并已有缓存，不读取各省原始数据：

```powershell
python scripts/build_data.py merge
```

查看缓存覆盖范围：

```powershell
python scripts/build_data.py status
```

## 本地预览

```powershell
python -m http.server 5174 --bind 127.0.0.1
```

打开 `http://127.0.0.1:5174/`。

## GitHub Pages

推送到 `main` 后，`.github/workflows/pages.yml` 只打包：

- `index.html`
- `.nojekyll`
- `public/`

原始 Excel、本地缓存和价量映射维护表不会进入 GitHub 仓库或 Pages 部署包。在仓库 `Settings -> Pages` 中将 Source 设为 `GitHub Actions`，之后每次推送会自动更新网站。
