# -*- coding: utf-8 -*-
"""
Generates 32 cohesive, studio-grade risograph/screenprint skate-deck & floppy-disk artworks
using gemini-3.1-flash-image (Nano Banana 2) for Shannon's Founder Archive.
"""
import os
import json
import base64
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from PIL import Image

ATLAS_DIR = r"C:\Users\shann\Desktop\OmniVeo_Workspaces\01_Active_Projects\Floppy-Founder-Atlas"
ART_DIR = os.path.join(ATLAS_DIR, "art")
DIST_ART_DIR = os.path.join(ATLAS_DIR, "dist", "art")
os.makedirs(ART_DIR, exist_ok=True)
os.makedirs(DIST_ART_DIR, exist_ok=True)

STYLE_PREFIX = (
    "Cohesive boutique skateboard-deck & archival studio print illustration. "
    "Mid-century modern screenprint and tactile risograph aesthetic, heavy matte cotton-paper grain texture, "
    "subtle vintage ink distress, bold iconic silhouette, gallery quality, warm studio lighting. "
    "STRICT RULE: ZERO text, NO letters, NO words, NO numbers, NO UI screens, NO watermarks. "
    "Wide 16:9 horizontal composition centered for a floppy disk window. Subject: "
)

ART_PROMPTS = {
    "floppy": "Three minimalist human figures standing on dark charcoal paper around a giant warm terracotta-orange sun, with cream archival paper sheets floating in a gentle circle.",
    "lumen": "A sleek brushed-aluminum tuning fork emitting a single warm golden soundwave ribbon through a floating glass ring on deep midnight charcoal paper.",
    "stratemark": "An isometric mid-century board-game city grid on warm cream paper with one glowing amber property monolith and a brass architectural compass.",
    "ai-slot-machine": "Three vintage mechanical brass slot-machine reels displaying bauhaus geometric symbols (star, lightning, prism) with a pulled cast-iron lever on deep espresso-charcoal paper.",
    "project-thanos": "A tactile handheld retro hardware controller with a warm amber joystick surrounded by five orbiting geometric moons connected by fine golden threads on deep slate-green paper.",
    "open-creative-mcp": "An artist's wooden mannequin hand holding a paintbrush, fountain pen nib, and a glowing geometric wireframe cube linked by a terracotta ribbon on warm cream paper.",
    "omnidirector": "A vintage 35mm brass film reel unspooling into hand-painted cel animation frames of a bird in flight against a warm ochre and charcoal background.",
    "omnispatial": "Three floating architectural window frames suspended in a serene starlit atrium with a brass pendulum and prism, deep indigo and cream risograph.",
    "the-bridge": "A monumental stone arch bridge spanning two dark cliffs with a single glowing golden key suspended at the center keystone on deep forest-green paper.",
    "flip-autopilot": "A stack of vintage vinyl records in colorful sleeves beside a classic rangefinder camera on a warm sunlit wooden crate, terracotta and cream screenprint.",
    "ai-founder-stack": "A minimalist coastal lighthouse casting a warm golden beam across stylized paper clouds and stacked geometric server monoliths on deep navy paper.",
    "arcade-companion": "A miniature tabletop wooden retro arcade cabinet glowing warmly on a dark studio desk with a friendly geometric pixel-face on its screen.",
    "meetscribe": "A vintage brass fountain pen nib touching a dark inkwell, sending concentric golden soundwave ripples across warm cream archival paper.",
    "openchatcut": "Vintage brass tailor shears cleanly cutting a ribbon of 35mm film strip into crisp vertical frames on terracotta and charcoal paper.",
    "openconnector": "A mid-century analog switchboard with woven cloth patch cords connecting brass jacks in a harmonious geometric pattern on cream and slate-teal paper.",
    "comfyui-studio": "Alchemical glass flasks and botanical stems connected like a node graph, blooming into a radiant geometric lotus flower on dark charcoal paper.",
    "watchtower-talos": "An ancient Greek Corinthian bronze helmet and a glowing stone watchtower overlooking a calm geometric sea at night, charcoal and gold screenprint.",
    "daily-ai-shorts": "A warm vintage wood-cabinet television set showing a cozy red cardigan sweater silhouette and a glowing vertical cinema beam on muted olive paper.",
    "lidenbrock": "A cross-section of subterranean geological earth layers revealing a glowing crystal cavern and a vintage brass explorer compass, rust and cream print.",
    "posey-treasure": "Weathered topographic mountain contour lines on vintage parchment paper with a crimson compass rose and a lone pine tree silhouette.",
    "ps5-incubator": "A sleek boutique studio rack of colorful minimalist game cartridges illuminated by a warm gallery spotlight on deep indigo paper.",
    "project-argo": "A stylized ancient Greek wooden trireme ship with a golden geometric sail navigating under a starry constellation map on midnight blue paper.",
    "auralux": "A luminous translucent hand silhouette touching a rippling pool of golden and violet light on dark charcoal paper, risograph grain.",
    "council-ai": "Five minimalist mid-century chairs arranged in a circle around a glowing warm stone hearth table beneath an arched colonnade, terracotta and charcoal.",
    "flowcreate-parlor": "Three vintage illustrated playing cards fanning out into nine glowing geometric constellation sigils on a deep green parlor table.",
    "grand-exchange": "A grand arched marketplace pavilion with balanced brass apothecary scales and framed art canvases on warm sand and Prussian blue paper.",
    "novah-chronicles": "A misty coastal redwood forest meeting a dark brutalist tower in the distance, with a glowing warm paper crane flying in the foreground.",
    "ai-guild-arcana": "A woodcut tarot-style illustration of a prehistoric craftsman carving a glowing geometric star with a stone chisel under a crescent moon.",
    "pangea-notebook": "An open leather-bound sketchbook whose paper pages fold upward into a three-dimensional mountain range and floating islands on warm cream paper.",
    "executive-cockpits": "A vintage brass maritime sextant, a red leather ledger book, and an hourglass arranged neatly on a dark green architect desk.",
    "extreme-game-trailer": "A stylized retro-futuristic black tour trailer with warm amber racing stripes rolling down a palm-lined coastal highway at sunset, screenprint.",
    "poetic-chivalry": "A medieval knight's plumed helmet resting beside a wooden skateboard deck and a blooming crimson rose on warm cream archival paper."
}

def generate_one(pid, prompt_body, api_key):
    out_file = os.path.join(ART_DIR, f"atlas-{pid}.jpg")
    dist_file = os.path.join(DIST_ART_DIR, f"atlas-{pid}.jpg")
    if os.path.exists(out_file) and os.path.getsize(out_file) > 10000:
        if not os.path.exists(dist_file):
            with open(out_file, "rb") as fsrc, open(dist_file, "wb") as fdst:
                fdst.write(fsrc.read())
        return pid, True, "cached"

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent"
    full_prompt = STYLE_PREFIX + prompt_body
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]}
    }
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "x-goog-api-key": api_key}
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                res = json.loads(resp.read().decode("utf-8"))
            cands = res.get("candidates", [])
            parts = cands[0].get("content", {}).get("parts", []) if cands else []
            for p in parts:
                if "inlineData" in p:
                    raw_bytes = base64.b64decode(p["inlineData"]["data"])
                    img = Image.open(BytesIO(raw_bytes)).convert("RGB")
                    # Center-crop to 16:9 aspect ratio (800x450) for crisp, fast-loading floppy window art
                    w, h = img.size
                    target_ratio = 16 / 9
                    cur_ratio = w / h
                    if cur_ratio > target_ratio:
                        new_w = int(h * target_ratio)
                        left = (w - new_w) // 2
                        img = img.crop((left, 0, left + new_w, h))
                    else:
                        new_h = int(w / target_ratio)
                        top = (h - new_h) // 2
                        img = img.crop((0, top, w, top + new_h))
                    img = img.resize((800, 450), Image.Resampling.LANCZOS)
                    img.save(out_file, format="JPEG", quality=88, optimize=True)
                    img.save(dist_file, format="JPEG", quality=88, optimize=True)
                    return pid, True, f"{os.path.getsize(out_file):,} bytes"
        except Exception as e:
            time.sleep(2 * (attempt + 1))
            last_err = str(e)
    return pid, False, last_err

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    print(f"Generating {len(ART_PROMPTS)} studio artworks with gemini-3.1-flash-image...")
    results = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futs = {pool.submit(generate_one, pid, prompt, api_key): pid for pid, prompt in ART_PROMPTS.items()}
        for fut in as_completed(futs):
            pid, ok, info = fut.result()
            print(f"  [{'OK' if ok else 'ERR'}] {pid}: {info}", flush=True)
            results.append((pid, ok, info))
    ok_count = sum(1 for _, ok, _ in results if ok)
    print(f"Completed: {ok_count}/{len(ART_PROMPTS)} artworks ready.")

if __name__ == "__main__":
    main()
