import os
import base64
import time
from io import BytesIO
from PIL import Image
from google import genai

def resize_and_save(image_bytes, output_paths):
    img = Image.open(BytesIO(image_bytes))
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    img = img.resize((800, 450), Image.Resampling.LANCZOS)
    
    for path in output_paths:
        img.save(path, format='JPEG', quality=95)

def main():
    client = genai.Client()

    projects = {
        "lumen": "Sovereign zero-latency (<200ms) desktop voice HUD with billet-aluminum 60fps waveform and multimodal screen intent capture.",
        "stratemark": "Fast-boot (2–4s) multi-agent competitive intelligence Living Deck Builder & Collectible Company Card Lab.",
        "ai-slot-machine": "The Call of Duty 'Pack-a-Punch' machine for web apps. 25¢ quarter credits, mechanical coin-slot UI.",
        "project-thanos": "Universal software layer & context nervous system for orchestrating parallel AI coding agents across Mobile, VR/Spatial, Desktop HUD, and ultra-cheap micro-hardware.",
        "open-creative-mcp": "Bake Model Context Protocol (MCP) bridges directly into open-source equivalents of Adobe Creative Cloud (Blender, Krita, GIMP, Inkscape, Penpot, Natron, Audacity) so AI agents can manipulate layers, vector nodes, 3D cameras, and timelines.",
        "omnispatial-framez": "Infinite 4-window Meta Quest 3 spatial WebXR workstation with Newtonian UI physics.",
        "arcade-companion": "Miniature retro arcade cabinet desktop companion (<$20 ESP32-S3 BOM) with animated IPS face and I2S audio.",
        "the-bridge": "Sovereign multi-account Google OAuth & Windows DPAPI TokenVault + zero-scroll connection deck.",
        "open-connector": "Self-hosted auth gateway exposing 1,500+ third-party apps to the agent fleet via MCP.",
        "hermes-watchtower": "Fleet security sentinel, daemon health monitor, and credential quarantine boundary.",
        "project-argo": "Deterministic multi-agent software factory replacing conversational drift with strict 5-part Meta-Prompt contracts and specialist personas.",
        "auralux": "Ambient screen-orchestrating 'Ghost Layer' mentor that sees your active viewport and guides complex creative/engineering workflows in real time.",
        "lidenbrock": "Deep codebase exploration and interactive AST knowledge graph visualization.",
        "omnidirector": "13-step headless media factory & 1.0x real-time anime cel dubbing engine.",
        "openchatcut": "Conversational chat-to-video editor with automated silence trimming, animated captions, and 9:16 social clip reframing.",
        "comfyui-studio": "Sovereign local generative AI image, video, and audio synthesis engine exposed via MCP.",
        "daily-ai-shorts": "Autonomous 9:16 generative I2V video production and wholesome news synthesis.",
        "flowcreate-perrys-parlor": "Tabletop RPG card mechanic for context engineering paired with a minimalist voice-and-pen single-asset transformation canvas.",
        "novah-city-chronicles": "Cinematic transmedia world and high-fidelity voice-native AI 'Spirit Guides' that evolve via skill trees alongside the creator.",
        "pangea-notebook": "Where every world begins — project-as-a-living-book co-authored with AI, paired with instant slide deck and guided form synthesis.",
        "ai-founder-stack": "Curated directory of $850k+ in verified cloud compute credits, GPU clusters, free LLM APIs, and developer grants.",
        "flip-marketplace-autopilot": "Local garage & vinyl inventory cataloger + client-side stealth Facebook Marketplace auto-lister.",
        "council-circle-ai": "Personal advisory council of your favorite YouTube/Podcast mentors trained via RAG for morning/evening briefs, plus multi-agent peer deliberation.",
        "grand-exchange-show-tell": "Anti-doomscrolling 3D masonry discovery grid paired with a RuneScape-inspired bid/ask creator asset marketplace and IP licensing desk.",
        "ai-guild-skill-deck": "Gamified creator academy ('Stone Age simple, Space Age smart') where skills are collected and shared as Tarot Arcana cards backed by Git repositories.",
        "meetscribe-omnisync": "Autonomous Google Meet attendance bot, speaker diarization, and async cross-timezone executive handoff engine.",
        "posey-treasure-hunt": "Multi-agent geospatial riddle solver, 24-rule disproof matrix, USGS/EPA coordinate auditor, and offline GPX mobile field kit.",
        "ps5-venture-incubator": "12-slide master investor deck and PS5 horizontal game-library venture launcher.",
        "executive-cockpits-careflow": "Role-specialized command centers for CEO strategy, CFO FinOps/subscriptions, legal docket tracking, and automated IHSS timesheet math.",
        "extreme-game-trailer": "High-converting SoCal mobile game truck booking platform + automated schedule parser with traffic/setup buffer math.",
        "miranda-realty-poetic-chivalry": "Local SMB web & review growth automation + preserved personal lifestyle apparel brand.",
    }
    
    # We optionally do floppy if not present or just keep the existing one. "Keep `01_floppy_bird_skate_mascot.jpg` for Floppy itself if you want, but regenerate the rest to be literal and cinematic"
    # Actually, floppy is currently in founder-atlas-data.mjs as "floppy". So I will regenerate it just in case, or leave it out if we want to keep the old one. I will regenerate it but with the concept:
    projects["floppy"] = "Tactile 3.5-inch disk command center that kills venture studio sprawl, tracks the 5-stage lifecycle, and surfaces one clear Next Action."

    base_prompt = "Cinematic, high-fidelity, photorealistic product visualization. Literal and highly relevant to the concept. Modern portfolio aesthetic, beautiful lighting, Unreal Engine 5 render style. ZERO text, NO words. "

    art_dir = "C:/Users/shann/Desktop/OmniVeo_Workspaces/01_Active_Projects/Floppy-Founder-Atlas/art"
    dist_art_dir = "C:/Users/shann/Desktop/OmniVeo_Workspaces/01_Active_Projects/Floppy-Founder-Atlas/dist/art"

    for project_id, core_thesis in projects.items():
        print(f"Generating image for project {project_id}...")
        prompt = base_prompt + core_thesis
        
        try:
            interaction = client.interactions.create(
                model="gemini-3.1-flash-image",
                input=prompt,
                response_format={
                    "type": "image",
                    "aspect_ratio": "16:9",
                }
            )
            
            if interaction.output_image and interaction.output_image.data:
                image_bytes = base64.b64decode(interaction.output_image.data)
                filename = f"atlas-{project_id}.jpg"
                path1 = os.path.join(art_dir, filename)
                path2 = os.path.join(dist_art_dir, filename)
                resize_and_save(image_bytes, [path1, path2])
                print(f"Saved {filename}")
            else:
                print(f"Failed to generate image for {project_id} - no output image.")
                
        except Exception as e:
            print(f"Error generating for {project_id}: {e}")
            
        time.sleep(1)

if __name__ == "__main__":
    main()
