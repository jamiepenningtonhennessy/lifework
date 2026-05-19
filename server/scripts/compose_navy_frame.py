#!/usr/bin/env python3.11
"""
Navy Frame compositor for Lifework LinkedIn images.
Usage: python3.11 compose_navy_frame.py <photo_path> <tangram_path> <serif_font_path> <sans_font_path> <category_label> <output_path>

Canvas: 1080×1080px
- Outer frame: navy #1a2744, full bleed
- Inner photo: reduced to fit above a taller bottom rail
- Bottom rail: 200px tall — logo lockup extends to ~mid-image width, large category label on right
"""
import sys
from PIL import Image, ImageDraw, ImageFont

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

NAVY  = hex_to_rgb('#1a2744')
CREAM = hex_to_rgb('#f5f0e8')
GOLD  = hex_to_rgb('#d4a634')

CANVAS_W, CANVAS_H = 1080, 1080
MARGIN = 60

# Taller rail to accommodate larger branding
RAIL_H = 200
RAIL_Y = CANVAS_H - RAIL_H  # 880

# Photo fills the space above the rail (minus top/side margins)
PHOTO_W = CANVAS_W - 2 * MARGIN   # 960
PHOTO_H = RAIL_Y - MARGIN          # 820  (was 890 — slightly shorter to give rail room)

# Branding sizes — tangram + wordmark together reach roughly mid-canvas (~540px)
MARK_SIZE          = 90    # tangram square
WORDMARK_FONT_SIZE = 90    # "Lifework" serif — large enough to reach mid-image
LABEL_FONT_SIZE    = 38    # category label on right — prominent


def compose(photo_path, tangram_path, serif_font_path, sans_font_path, category_label, output_path):
    # 1. Navy canvas
    canvas = Image.new('RGB', (CANVAS_W, CANVAS_H), NAVY)

    # 2. Inner photo
    photo = Image.open(photo_path).convert('RGB')
    photo = photo.resize((PHOTO_W, PHOTO_H), Image.LANCZOS)
    canvas.paste(photo, (MARGIN, MARGIN))

    # 3. Tangram mark — vertically centred in rail
    tangram = Image.open(tangram_path).convert('RGBA')
    tangram = tangram.resize((MARK_SIZE, MARK_SIZE), Image.LANCZOS)
    mark_x = MARGIN
    mark_y = RAIL_Y + (RAIL_H - MARK_SIZE) // 2
    canvas.paste(tangram, (mark_x, mark_y), tangram)

    # 4. "Lifework" wordmark — serif, cream, vertically centred in rail
    draw = ImageDraw.Draw(canvas)
    try:
        serif_font = ImageFont.truetype(serif_font_path, size=WORDMARK_FONT_SIZE)
    except Exception:
        serif_font = ImageFont.load_default()

    wordmark_text = "Lifework"
    wordmark_x = mark_x + MARK_SIZE + 18
    bbox = draw.textbbox((0, 0), wordmark_text, font=serif_font)
    text_h = bbox[3] - bbox[1]
    wordmark_y = RAIL_Y + (RAIL_H - text_h) // 2 - bbox[1]
    draw.text((wordmark_x, wordmark_y), wordmark_text, font=serif_font, fill=CREAM)

    # 5. Category label — uppercase sans, right-aligned, 78% opacity
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

    opacity = 0.78
    blended = tuple(int(c * opacity + n * (1 - opacity)) for c, n in zip(CREAM, NAVY))
    draw.text((label_x, label_y), label_text, font=sans_font, fill=blended)

    # 6. Save
    canvas.save(output_path, 'PNG', optimize=True)
    print(f"Saved: {output_path}")


if __name__ == '__main__':
    if len(sys.argv) != 7:
        print("Usage: compose_navy_frame.py <photo> <tangram> <serif_font> <sans_font> <label> <output>")
        sys.exit(1)
    compose(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])
