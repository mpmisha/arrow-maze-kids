#!/usr/bin/env python3
"""
Generate original beveled Playground icon artwork for Arrow Maze Kids.
Creates icon-180.png, icon-192.png, icon-512.png, and icon-1024.png.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

def draw_icon(size):
  # Base twilight gradient background
  img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
  draw = ImageDraw.Draw(img)

  margin = int(size * 0.05)
  radius = int(size * 0.22)

  # Rounded background plate
  rect = [margin, margin, size - margin, size - margin]

  # Background plate gradient (rgb(92,120,219) -> rgb(56,66,153))
  for y in range(margin, size - margin):
    progress = (y - margin) / (size - margin * 2)
    r = int(92 + (56 - 92) * progress)
    g = int(120 + (66 - 120) * progress)
    b = int(219 + (153 - 219) * progress)
    draw.line([(margin, y), (size - margin, y)], fill=(r, g, b, 255))

  # Create rounded mask for plate
  mask = Image.new("L", (size, size), 0)
  mask_draw = ImageDraw.Draw(mask)
  mask_draw.rounded_rectangle(rect, radius=radius, fill=255)

  # Apply mask
  output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
  output.paste(img, (0, 0), mask)

  # Draw Beveled Arrow Artwork on top
  draw_out = ImageDraw.Draw(output)

  cx, cy = size / 2, size / 2
  arrow_scale = size * 0.35

  # Beveled Arrow Shape Points (pointing Up-Right)
  # Main Arrow Body
  head_x, head_y = cx + arrow_scale * 0.6, cy - arrow_scale * 0.6
  tail_x, tail_y = cx - arrow_scale * 0.6, cy + arrow_scale * 0.6

  # Draw a friendly, thick, beveled candy arrow
  # Base arrow path (Candy Green / Gold)
  arrow_width = int(size * 0.12)

  # Draw stem
  draw_out.line([(tail_x, tail_y), (head_x, head_y)], fill=(87, 199, 112, 255), width=arrow_width)

  # Draw Arrow Head
  head_size = int(size * 0.22)
  p1 = (head_x, head_y - head_size)
  p2 = (head_x + head_size, head_y)
  p3 = (head_x - head_size * 0.4, head_y + head_size * 0.4)
  p4 = (head_x - head_size * 0.4, head_y - head_size * 0.4)

  # Gold Arrow Head Triangle
  head_points = [
      (head_x + head_size * 0.2, head_y - head_size * 0.8),
      (head_x + head_size * 0.8, head_y - head_size * 0.2),
      (head_x - head_size * 0.3, head_y + head_size * 0.3)
  ]
  draw_out.polygon(head_points, fill=(255, 204, 61, 255))

  # Highlight / Bevel Top Edge
  draw_out.ellipse([cx - size*0.1, cy - size*0.1, cx + size*0.1, cy + size*0.1], fill=(255, 255, 255, 180))

  return output

def main():
  script_dir = os.path.dirname(os.path.abspath(__file__))
  icons_dir = os.path.join(os.path.dirname(script_dir), "icons")
  os.makedirs(icons_dir, exist_ok=True)

  sizes = [180, 192, 512, 1024]
  for s in sizes:
    icon_path = os.path.join(icons_dir, f"icon-{s}.png")
    img = draw_icon(s)
    img.save(icon_path, "PNG")
    print(f"Generated {icon_path}")

if __name__ == "__main__":
  main()
