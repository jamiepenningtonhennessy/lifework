#!/usr/bin/env python3.11
"""
Navy Frame compositor for Lifework LinkedIn images.
Usage: python3.11 compose_navy_frame.py <photo_path> <tangram_path> <serif_font_path> <sans_font_path> <category_label> <output_path>

Canvas: 1080×1080px
- Outer frame: navy #1a2744, full bleed
- Inner photo: 960×890px at (60, 60)
- Bottom rail: 130px tall navy strip at y=950
  - Left: tangram mark (56×56) + "Lifework" wordmark in serif, cream #f5f0e8, 60px from left
  - Right: category label in uppercase sans, cream #f5f0e8, 78% opacity, 60px from right
"""
import sys
import os
from PIL import Image, ImageDraw, ImageFont

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

NAVY = hex_to_rgb('#1a2744')
CREAM = hex_to_rgb('#f5f0e8')
GOLD = hex_to_rgb('#d4a634')

CANVAS_W, CANVAS_H = 1080, 1080
MARGIN = 60
PHOTO_W, PHOTO_H = 960, 890
RAIL_H = 130
RAIL_Y = CANVAS_H - RAIL_H  # 950

# Increased sizes to match reference image
MARK_SIZE = 56          # was 36 — larger tangram square
WORDMARK_FONT_SIZE = 58 # was 42 — larger "Lifework" wordmark
LABEL_FONT_SIZE = 26    # was 18 — larger category label

def compose(photo_path, tangram_path, serif_font_path, sans_font_path, category_label, output_path):
    # 1. Create navy canvas
    canvas = Image.new('RGB', (CANVAS_W, CANVAS_H), NAVY)

    # 2. Load and resize inner photo to 960×890
    photo = Image.open(photo_path).convert('RGB')
    photo = photo.resize((PHOTO_W, PHOTO_H), Image.LANCZOS)
    canvas.paste(photo, (MARGIN, MARGIN))

    # 3. Load tangram mark and resize to MARK_SIZE
    tangram = Image.open(tangram_path).convert('RGBA')
    tangram = tangram.resize((MARK_SIZE, MARK_SIZE), Image.LANCZOS)
    # Paste tangram onto canvas in bottom rail, vertically centred
    mark_x = MARGIN  # 60px from left
    mark_y = RAIL_Y + (RAIL_H - MARK_SIZE) // 2  # vertically centred in rail
    canvas.paste(tangram, (mark_x, mark_y), tangram)

    # 4. Draw "Lifework" wordmark in serif font
    draw = ImageDraw.Draw(canvas)
    try:
        serif_font = ImageFont.truetype(serif_font_path, size=WORDMARK_FONT_SIZE)
    except Exception:
        serif_font = ImageFont.load_default()

    wordmark_text = "Lifework"
    # Position wordmark to the right of the tangram mark with 14px gap
    wordmark_x = mark_x + MARK_SIZE + 14
    # Vertically centre the text in the rail
    bbox = draw.textbbox((0, 0), wordmark_text, font=serif_font)
    text_h = bbox[3] - bbox[1]
    wordmark_y = RAIL_Y + (RAIL_H - text_h) // 2 - bbox[1]
    draw.text((wordmark_x, wordmark_y), wordmark_text, font=serif_font, fill=CREAM)

    # 5. Draw category label in uppercase sans, right-aligned, 78% opacity
    try:
        sans_font = ImageFont.truetype(sans_font_path, size=LABEL_FONT_SIZE)
    except Exception:
        sans_font = ImageFont.load_default()

    label_text = category_label.upper()
    label_bbox = draw.textbbox((0, 0), label_text, font=sans_font)
    label_w = label_bbox[2] - label_bbox[0]
    label_h = label_bbox[3] - label_bbox[1]
    label_x = CANVAS_W - MARGIN - label_w
    label_y = RAIL_Y + (RAIL_H - label_h) // 2 - label_bbox[1]

    # Apply 78% opacity by blending cream with navy background
    opacity = 0.78
    blended = tuple(int(c * opacity + n * (1 - opacity)) for c, n in zip(CREAM, NAVY))
    draw.text((label_x, label_y), label_text, font=sans_font, fill=blended)

    # 6. Save output
    canvas.save(output_path, 'PNG', optimize=True)
    print(f"Saved: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) != 7:
        print("Usage: compose_navy_frame.py <photo> <tangram> <serif_font> <sans_font> <label> <output>")
        sys.exit(1)
    compose(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])
