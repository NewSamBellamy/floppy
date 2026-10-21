import os
import base64
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

    project_id = "flip-marketplace-autopilot"
    core_thesis = "Local garage and vintage vinyl record inventory cataloger and marketplace management suite."
    
    base_prompt = "Cinematic, high-fidelity, photorealistic product visualization. Literal and highly relevant to the concept. Modern portfolio aesthetic, beautiful lighting, Unreal Engine 5 render style. ZERO text, NO words. "
    prompt = base_prompt + core_thesis

    art_dir = "C:/Users/shann/Desktop/OmniVeo_Workspaces/01_Active_Projects/Floppy-Founder-Atlas/art"
    dist_art_dir = "C:/Users/shann/Desktop/OmniVeo_Workspaces/01_Active_Projects/Floppy-Founder-Atlas/dist/art"

    print(f"Generating image for project {project_id}...")
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

if __name__ == "__main__":
    main()
