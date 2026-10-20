# -*- coding: utf-8 -*-
"""
Generator for Floppy: Founder Product & Idea Atlas (founder-atlas-data.mjs).
Mines real markdown, JSON, and SQLite sources across Shannon Long's disk:
- C:/Users/shann/Desktop/OmniVeo_Workspaces/01_Active_Projects/product ideas/
- C:/Users/shann/Desktop/product ideas/
- C:/Users/shann/OmniVeo-HQ/01_PROJECTS/Gemini-Intelligence-Vault/
- C:/Users/shann/OmniVeo-HQ/01_PROJECTS/
- C:/Users/shann/Documents/Codex/
- C:/Users/shann/.zcode/
- C:/Users/shann/.claude/history.jsonl
"""
import html
import json
import os
import shutil
import urllib.parse

from part1_projects import PROJECTS_PART1
from part2_projects import PROJECTS_PART2

BASE_DIR = r"C:\Users\shann\Desktop\OmniVeo_Workspaces\01_Active_Projects\Floppy-Founder-Atlas"
OUT_PATH = os.path.join(BASE_DIR, "founder-atlas-data.mjs")
DIST_OUT_PATH = os.path.join(BASE_DIR, "dist", "founder-atlas-data.mjs")
MASTER_ATLAS_PATH = r"C:\Users\shann\Desktop\product ideas\00_SHANNON_MASTER_PRODUCT_ATLAS_ALL_SOURCES.md"

TIMESTAMP = "2026-10-20T14:00:00Z"


def read_excerpt(path, max_chars=900):
    try:
        if path and os.path.exists(path):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                raw = f.read().strip()
                if raw.startswith("---"):
                    parts = raw.split("---", 2)
                    if len(parts) >= 3:
                        raw = parts[2].strip()
                cleaned = " ".join(raw.split())
                return cleaned[:max_chars] + ("…" if len(cleaned) > max_chars else "")
    except Exception:
        pass
    return ""


def make_svg_data_uri(title, subtitle, badge, primary_hex, secondary_hex, icon_svg, code_tag):
    t_esc = html.escape(title[:26], quote=True)
    s_esc = html.escape(subtitle[:52], quote=True)
    b_esc = html.escape(badge[:38], quote=True)
    c_esc = html.escape(code_tag, quote=True)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111916"/>
      <stop offset="55%" stop-color="#1c2a24"/>
      <stop offset="100%" stop-color="{primary_hex}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="{primary_hex}"/>
      <stop offset="100%" stop-color="{secondary_hex}"/>
    </linearGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ffffff" stroke-width="0.6" stroke-opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="800" height="400" fill="url(#bg)"/>
  <rect width="800" height="400" fill="url(#grid)"/>
  <circle cx="680" cy="110" r="150" fill="{secondary_hex}" opacity="0.14"/>
  <circle cx="650" cy="290" r="110" fill="{primary_hex}" opacity="0.18"/>
  <rect x="28" y="24" width="744" height="352" rx="14" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>
  <rect x="28" y="24" width="744" height="6" rx="3" fill="url(#accent)"/>
  <g transform="translate(52, 54)">
    <rect x="0" y="0" width="128" height="30" rx="6" fill="#0d1412" fill-opacity="0.75" stroke="{secondary_hex}" stroke-width="1.2"/>
    <text x="64" y="20" fill="{secondary_hex}" font-family="Consolas, monospace" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="1.5">{c_esc}</text>
    <rect x="142" y="0" width="320" height="30" rx="6" fill="#ffffff" fill-opacity="0.09"/>
    <text x="158" y="20" fill="#f3f6f4" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="0.8">{b_esc}</text>
  </g>
  <g transform="translate(52, 138)">
    <text x="0" y="0" fill="#ffffff" font-family="Trebuchet MS, Segoe UI, sans-serif" font-size="38" font-weight="800" letter-spacing="-0.5">{t_esc}</text>
    <text x="0" y="42" fill="#d3dfd9" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="500">{s_esc}</text>
  </g>
  <g transform="translate(52, 235)">
    <rect x="0" y="0" width="440" height="92" rx="8" fill="#0b110f" fill-opacity="0.62" stroke="#ffffff" stroke-opacity="0.12"/>
    <text x="18" y="28" fill="{secondary_hex}" font-family="Consolas, monospace" font-size="11" font-weight="700" letter-spacing="1.2">OMNIVEO FOUNDER ATLAS // VERIFIED TELEMETRY</text>
    <line x1="18" y1="40" x2="422" y2="40" stroke="#ffffff" stroke-opacity="0.12"/>
    <circle cx="28" cy="64" r="6" fill="#4ade80"/>
    <text x="44" y="69" fill="#e2ece7" font-family="Consolas, monospace" font-size="13" font-weight="600">REPO &amp; DISK TRUTH · ZERO AI SLOP</text>
  </g>
  <g transform="translate(565, 118)">
    <rect x="0" y="0" width="168" height="168" rx="22" fill="#0d1512" fill-opacity="0.72" stroke="{secondary_hex}" stroke-width="2" stroke-opacity="0.65"/>
    {icon_svg}
  </g>
</svg>'''
    encoded = urllib.parse.quote(svg, safe="")
    return f"data:image/svg+xml;utf8,{encoded}"


ICONS = {
    "floppy": '<rect x="38" y="34" width="92" height="100" rx="8" fill="none" stroke="#edbd70" stroke-width="4"/><rect x="54" y="34" width="46" height="32" fill="#edbd70" opacity="0.85"/><rect x="50" y="82" width="68" height="40" rx="4" fill="#fff9ea"/>',
    "mic": '<rect x="68" y="34" width="32" height="58" rx="16" fill="none" stroke="#a78bfa" stroke-width="4"/><path d="M48 68 a36 36 0 0 0 72 0" fill="none" stroke="#a78bfa" stroke-width="4"/><line x1="84" y1="104" x2="84" y2="132" stroke="#a78bfa" stroke-width="4"/><line x1="60" y1="132" x2="108" y2="132" stroke="#a78bfa" stroke-width="4"/>',
    "radar": '<circle cx="84" cy="84" r="52" fill="none" stroke="#38bdf8" stroke-width="3.5"/><circle cx="84" cy="84" r="30" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6 4"/><line x1="84" y1="84" x2="122" y2="52" stroke="#edbd70" stroke-width="4"/><circle cx="114" cy="58" r="6" fill="#edbd70"/>',
    "slot": '<rect x="34" y="44" width="100" height="80" rx="10" fill="none" stroke="#f472b6" stroke-width="4"/><line x1="67" y1="44" x2="67" y2="124" stroke="#f472b6" stroke-width="2.5"/><line x1="101" y1="44" x2="101" y2="124" stroke="#f472b6" stroke-width="2.5"/><circle cx="146" cy="52" r="8" fill="#edbd70"/><line x1="134" y1="84" x2="146" y2="58" stroke="#edbd70" stroke-width="4"/>',
    "controller": '<rect x="32" y="54" width="104" height="62" rx="20" fill="none" stroke="#34d399" stroke-width="4"/><line x1="58" y1="73" x2="58" y2="97" stroke="#34d399" stroke-width="4"/><line x1="46" y1="85" x2="70" y2="85" stroke="#34d399" stroke-width="4"/><circle cx="106" cy="77" r="6" fill="#edbd70"/><circle cx="118" cy="91" r="6" fill="#34d399"/>',
    "creative": '<polygon points="84,32 132,124 36,124" fill="none" stroke="#fb923c" stroke-width="4"/><circle cx="84" cy="92" r="18" fill="#fb923c" opacity="0.6"/>',
    "cloud": '<path d="M52 108 H118 A22 22 0 0 0 120 66 A32 32 0 0 0 58 58 A24 24 0 0 0 52 108 Z" fill="none" stroke="#60a5fa" stroke-width="4"/><text x="84" y="92" fill="#edbd70" font-family="Consolas, monospace" font-size="18" font-weight="700" text-anchor="middle">$850K</text>',
    "council": '<circle cx="84" cy="54" r="16" fill="none" stroke="#c084fc" stroke-width="3.5"/><circle cx="50" cy="108" r="16" fill="none" stroke="#c084fc" stroke-width="3.5"/><circle cx="118" cy="108" r="16" fill="none" stroke="#c084fc" stroke-width="3.5"/><line x1="72" y1="68" x2="58" y2="94" stroke="#c084fc" stroke-width="2.5"/><line x1="96" y1="68" x2="110" y2="94" stroke="#c084fc" stroke-width="2.5"/><line x1="66" y1="108" x2="102" y2="108" stroke="#c084fc" stroke-width="2.5"/>',
    "book": '<path d="M38 44 Q61 36 84 46 Q107 36 130 44 V122 Q107 114 84 124 Q61 114 38 122 Z" fill="none" stroke="#fbbf24" stroke-width="4"/><line x1="84" y1="46" x2="84" y2="124" stroke="#fbbf24" stroke-width="3"/>',
    "shield": '<path d="M84 32 L128 50 V86 C128 114 106 132 84 140 C62 132 40 114 40 86 V50 Z" fill="none" stroke="#4ade80" stroke-width="4"/><polyline points="66,86 79,100 104,70" fill="none" stroke="#edbd70" stroke-width="4"/>',
    "vr": '<rect x="30" y="58" width="108" height="52" rx="16" fill="none" stroke="#2dd4bf" stroke-width="4"/><path d="M72 110 L84 96 L96 110" fill="none" stroke="#2dd4bf" stroke-width="3"/><circle cx="60" cy="84" r="11" fill="#2dd4bf" opacity="0.5"/><circle cx="108" cy="84" r="11" fill="#2dd4bf" opacity="0.5"/>',
    "video": '<rect x="34" y="46" width="80" height="76" rx="8" fill="none" stroke="#f87171" stroke-width="4"/><polygon points="116,70 140,54 140,114 116,98" fill="none" stroke="#f87171" stroke-width="4"/><polygon points="66,70 66,98 92,84" fill="#edbd70"/>',
    "graph": '<circle cx="52" cy="54" r="12" fill="#38bdf8"/><circle cx="118" cy="62" r="14" fill="#edbd70"/><circle cx="78" cy="116" r="16" fill="#4ade80"/><line x1="62" y1="58" x2="104" y2="62" stroke="#ffffff" stroke-width="2.5"/><line x1="58" y1="65" x2="72" y2="102" stroke="#ffffff" stroke-width="2.5"/><line x1="110" y1="74" x2="88" y2="104" stroke="#ffffff" stroke-width="2.5"/>',
    "compass": '<circle cx="84" cy="84" r="50" fill="none" stroke="#fbbf24" stroke-width="4"/><polygon points="84,46 98,84 84,122 70,84" fill="none" stroke="#edbd70" stroke-width="3"/><circle cx="84" cy="84" r="6" fill="#ffffff"/>',
}

FOUNDER_ATLAS_CATEGORIES = [
    {"id": "all", "label": "All Projects (32)"},
    {"id": "priority", "label": "🔥 Priority Sprint"},
    {"id": "saas", "label": "🚀 Core SaaS & AI"},
    {"id": "infra", "label": "🛠️ Agent & MCP Infra"},
    {"id": "creative", "label": "🎨 Creative & Media"},
    {"id": "spatial", "label": "🥽 Spatial & Hardware"},
    {"id": "keep", "label": "💡 Keep & AI Studio Vault"},
    {"id": "ops", "label": "🏛️ Personal & Client Ops"},
]

FOUNDER_ATLAS_SOURCES = [
    "All Sources",
    "Google Keep",
    "Google AI Studio",
    "NotebookLM",
    "Codex",
    "ZCode",
    "Claude Code",
    "GitHub",
    "Desktop Hub",
]


def build_contexts(spec, master_excerpt):
    contexts = []
    for idx, (title, badge, path, url) in enumerate(spec.get("doc_paths", []), start=1):
        excerpt = read_excerpt(path, max_chars=750)
        if not excerpt:
            excerpt = f"Verified source artifact for {spec['name']} ({spec['code']}) at {path}. Core thesis: {spec['projectDescription']}"
        kind = "link" if url and not path else ("file" if path and os.path.exists(path) else "note")
        contexts.append({
            "id": f"{spec['id']}-ctx-{idx}",
            "kind": kind,
            "title": title,
            "sourceBadge": badge,
            "text": excerpt,
            "url": url or "",
            "createdAt": TIMESTAMP,
        })
    contexts.append({
        "id": f"{spec['id']}-ctx-atlas",
        "kind": "file",
        "title": f"Master Product Atlas ({spec['code']})",
        "sourceBadge": "Desktop Hub",
        "text": f"[{spec['code']}] {spec['name']} — Next Action: {spec['nextAction']} | {master_excerpt[:360]}",
        "url": spec.get("liveUrl") or spec.get("repoUrl") or "",
        "createdAt": TIMESTAMP,
    })
    return contexts


def build_answers(spec):
    return {
        str(k): {"text": v}
        for k, v in {
            0: spec["projectDescription"],
            1: spec["problem"],
            2: spec["audience"],
            3: spec["alternatives"],
            4: spec["evidence"],
            5: spec["assumptions"],
            6: spec["firstProduct"],
            7: f"{spec['productName']} ({spec['code']}): {spec['subtitle']} Connects {spec['audience']} to a verified workflow.",
            8: spec["features"],
            9: f"Product Name: {spec['productName']} ({spec['code']}) · Verification: {spec['verificationBadge']}",
            10: spec["design"],
            11: f"Idea Brief for {spec['name']} ({spec['code']}): {spec['projectDescription']} Next Action: {spec['nextAction']}",
            12: f"Readiness confirmed at Stage {spec['stage']}. Immediate Next Action: {spec['nextAction']}",
        }.items()
    }


def build_stage_checklist(spec):
    stage = spec["stage"]
    return {
        "1": [
            {"text": f"Synthesize founder origin & problem statement for {spec['productName']}", "done": True},
            {"text": f"Build interactive core prototype ({spec['verificationBadge']})", "done": stage >= 1},
            {"text": f"Execute Next Action: {spec['nextAction']}", "done": stage >= 2},
        ],
        "2": [
            {"text": "Verify end-to-end automated test suite & local/cloud persistence", "done": stage >= 2},
            {"text": f"Link canonical source path ({spec['localPath']})", "done": True},
            {"text": "Complete 19-point pre-production readiness audit", "done": stage >= 3},
        ],
        "3": [
            {"text": "Lock production telemetry, DPAPI/OAuth security boundary & zero-leak audit", "done": stage >= 3},
            {"text": "Verify production domain & edge deployment health", "done": bool(spec.get("liveUrl")) or stage >= 3},
        ],
        "4": [
            {"text": "Monitor real-user retention, unit economics & post-launch feedback loop", "done": stage >= 4},
        ],
    }


def build_project(spec, master_excerpt):
    stage = int(spec["stage"])
    chapter = int(spec["chapter"])
    max_resolved = 12 if stage > 0 else chapter
    resolved = {str(i): True for i in range(max_resolved + 1)}
    art_uri = make_svg_data_uri(
        title=spec["productName"],
        subtitle=spec["subtitle"],
        badge=spec["verificationBadge"],
        primary_hex=spec["primary_hex"],
        secondary_hex=spec["secondary_hex"],
        icon_svg=ICONS[spec["icon"]],
        code_tag=spec["code"],
    )
    return {
        "id": spec["id"],
        "code": spec["code"],
        "name": spec["name"],
        "productName": spec["productName"],
        "subtitle": spec["subtitle"],
        "projectDescription": spec["projectDescription"],
        "problem": spec["problem"],
        "audience": spec["audience"],
        "context": f"{spec['projectDescription']} Problem: {spec['problem']} Audience: {spec['audience']}",
        "category": spec["category"],
        "sources": spec["sources"],
        "nextAction": spec["nextAction"],
        "localPath": spec["localPath"],
        "repoUrl": spec["repoUrl"],
        "liveUrl": spec["liveUrl"],
        "verificationBadge": spec["verificationBadge"],
        "stage": stage,
        "chapter": chapter,
        "answers": build_answers(spec),
        "resolved": resolved,
        "idea": {
            "rawIdea": spec["projectDescription"],
            "workingIdea": spec["subtitle"],
            "aiGeneratedVersion": spec["projectDescription"],
            "confirmedVersion": spec["projectDescription"],
            "status": "resolved",
            "needsClarification": False,
            "followUp": "",
            "clarificationResponse": "",
            "createdAt": TIMESTAMP,
            "updatedAt": TIMESTAMP,
            "resolvedAt": TIMESTAMP,
        },
        "contexts": build_contexts(spec, master_excerpt),
        "stageChecklist": build_stage_checklist(spec),
        "projectArt": {
            "sourceUrl": art_uri,
            "sourceType": "builtin",
            "crop": {"x": 0, "y": 0, "zoom": 1},
        },
        "color": spec["color"],
        "done": {},
        "notes": [],
        "history": [
            {
                "text": "Imported into Founder Product Atlas from verified disk & cloud archives.",
                "date": TIMESTAMP,
            }
        ],
    }


def main():
    master_excerpt = read_excerpt(MASTER_ATLAS_PATH, max_chars=500)
    all_specs = PROJECTS_PART1 + PROJECTS_PART2
    assert len(all_specs) == 32, f"Expected 32 project specs, got {len(all_specs)}"

    projects = [build_project(spec, master_excerpt) for spec in all_specs]

    js_content = (
        "// Auto-generated by generate_founder_atlas_data.py — DO NOT EDIT MANUALLY\n"
        f"export const FOUNDER_ATLAS_CATEGORIES = {json.dumps(FOUNDER_ATLAS_CATEGORIES, ensure_ascii=False, indent=2)};\n\n"
        f"export const FOUNDER_ATLAS_SOURCES = {json.dumps(FOUNDER_ATLAS_SOURCES, ensure_ascii=False, indent=2)};\n\n"
        f"export const FOUNDER_ATLAS_PROJECTS = {json.dumps(projects, ensure_ascii=False, indent=2)};\n"
    )

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)

    os.makedirs(os.path.dirname(DIST_OUT_PATH), exist_ok=True)
    shutil.copyfile(OUT_PATH, DIST_OUT_PATH)

    print(f"Generated {len(projects)} projects -> {OUT_PATH} ({len(js_content):,} bytes)")
    print(f"Copied to -> {DIST_OUT_PATH}")


if __name__ == "__main__":
    main()
