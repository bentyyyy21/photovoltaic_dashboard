from __future__ import annotations

import html
import json
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "可编辑地图.pptx"
OUTPUT = ROOT / "public" / "assets" / "china-map.svg"
OUTPUT_JS = ROOT / "public" / "assets" / "china-map.js"

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS = {"p": P_NS, "a": A_NS}

PROVINCES = {
    "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
    "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南",
    "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州",
    "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆", "台湾",
}

AUXILIARY_PROVINCES = {
    "Freeform 75": "广东",
    "Freeform 105": "广东",
    "Freeform 108": "上海",
    "Freeform 109": "上海",
    "Freeform 110": "上海",
}


def number(value: str | None) -> float:
    return float(value or 0)


def point(element: ET.Element) -> tuple[float, float]:
    return number(element.get("x")), number(element.get("y"))


def transformed_point(
    x: float,
    y: float,
    shape_off: tuple[float, float],
    shape_ext: tuple[float, float],
    path_size: tuple[float, float],
    group_ext: tuple[float, float],
    group_child_off: tuple[float, float],
    group_child_ext: tuple[float, float],
) -> tuple[float, float]:
    child_x = shape_off[0] + x * shape_ext[0] / path_size[0]
    child_y = shape_off[1] + y * shape_ext[1] / path_size[1]
    return (
        (child_x - group_child_off[0]) * group_ext[0] / group_child_ext[0],
        (child_y - group_child_off[1]) * group_ext[1] / group_child_ext[1],
    )


def fmt(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def shape_path(
    shape: ET.Element,
    group_ext: tuple[float, float],
    group_child_off: tuple[float, float],
    group_child_ext: tuple[float, float],
) -> str:
    xfrm = shape.find("./p:spPr/a:xfrm", NS)
    path = shape.find("./p:spPr/a:custGeom/a:pathLst/a:path", NS)
    if xfrm is None or path is None:
        return ""
    off = xfrm.find("a:off", NS)
    ext = xfrm.find("a:ext", NS)
    if off is None or ext is None:
        return ""
    shape_off = point(off)
    shape_ext = number(ext.get("cx")), number(ext.get("cy"))
    path_size = number(path.get("w")), number(path.get("h"))
    if not all((*shape_ext, *path_size, *group_ext, *group_child_ext)):
        return ""

    def tx(pt: ET.Element) -> tuple[float, float]:
        x, y = point(pt)
        return transformed_point(
            x,
            y,
            shape_off,
            shape_ext,
            path_size,
            group_ext,
            group_child_off,
            group_child_ext,
        )

    commands: list[str] = []
    for command in path:
        kind = command.tag.rsplit("}", 1)[-1]
        points = command.findall("a:pt", NS)
        if kind == "moveTo" and points:
            x, y = tx(points[0])
            commands.append(f"M {fmt(x)} {fmt(y)}")
        elif kind == "lnTo" and points:
            x, y = tx(points[0])
            commands.append(f"L {fmt(x)} {fmt(y)}")
        elif kind == "cubicBezTo" and len(points) == 3:
            coords = [tx(item) for item in points]
            commands.append("C " + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in coords))
        elif kind == "quadBezTo" and len(points) == 2:
            coords = [tx(item) for item in points]
            commands.append("Q " + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in coords))
        elif kind == "close":
            commands.append("Z")
    return " ".join(commands)


def build_svg() -> None:
    with zipfile.ZipFile(SOURCE) as archive:
        slide = ET.fromstring(archive.read("ppt/slides/slide1.xml"))

    groups = slide.findall(".//p:grpSp", NS)
    if not groups:
        raise ValueError("PPT中未找到地图组合形状")
    group = max(groups, key=lambda item: len(item.findall("p:sp", NS)))
    xfrm = group.find("./p:grpSpPr/a:xfrm", NS)
    if xfrm is None:
        raise ValueError("地图组合缺少坐标变换")
    ext = xfrm.find("a:ext", NS)
    child_off = xfrm.find("a:chOff", NS)
    child_ext = xfrm.find("a:chExt", NS)
    if ext is None or child_off is None or child_ext is None:
        raise ValueError("地图组合坐标不完整")
    group_ext = number(ext.get("cx")), number(ext.get("cy"))
    group_child_off = point(child_off)
    group_child_ext = number(child_ext.get("cx")), number(child_ext.get("cy"))

    paths: list[str] = []
    for shape in group.findall("p:sp", NS):
        props = shape.find("./p:nvSpPr/p:cNvPr", NS)
        name = props.get("name", "") if props is not None else ""
        province = name if name in PROVINCES else AUXILIARY_PROVINCES.get(name)
        if not province:
            continue
        path_data = shape_path(shape, group_ext, group_child_off, group_child_ext)
        if not path_data:
            continue
        auxiliary = " map-auxiliary" if name in AUXILIARY_PROVINCES else ""
        paths.append(
            f'  <path class="map-region{auxiliary}" data-province="{html.escape(province)}" '
            f'd="{path_data}"><title>{html.escape(province)}</title></path>'
        )

    if len({province for province in PROVINCES if any(f'data-province="{province}"' in path for path in paths)}) != len(PROVINCES):
        raise ValueError("PPT省级形状转换不完整")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    svg = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="中国省级示意地图"',
        f'  viewBox="0 0 {fmt(group_ext[0])} {fmt(group_ext[1])}" preserveAspectRatio="xMidYMid meet"',
        '  data-source="可编辑地图.pptx">',
        '  <title>中国省级示意地图</title>',
        *paths,
        '</svg>',
        '',
    ]
    svg_text = "\n".join(svg)
    OUTPUT.write_text(svg_text, encoding="utf-8")
    OUTPUT_JS.write_text(
        "window.CHINA_MAP_SVG = " + json.dumps(svg_text, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT} and {OUTPUT_JS} ({len(paths)} paths from {len(PROVINCES)} provinces)")


if __name__ == "__main__":
    build_svg()
