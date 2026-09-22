from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).parent
source = Image.open(OUT / 'teguh-badge-still.png').convert('RGB')
a = np.asarray(source)
# Remove connected exterior black only; dark artwork inside the holder stays solid.
dark = np.max(a, axis=2) <= 20
regions = Image.fromarray(np.where(dark, 255, 0).astype('uint8')).copy()
ImageDraw.floodfill(regions, (0, source.height - 1), 128)
mask = Image.fromarray(np.where(np.asarray(regions) == 128, 0, 255).astype('uint8'))
# Black openings in the metal ring and badge punch are physically empty space.
# Restrict these cutouts to their visible enclosed openings, away from the clip.
for x, y in [(540, 253), (594, 266), (543, 485), (590, 486)]:
    if dark[y, x]:
        hole = Image.fromarray(np.where(dark, 255, 0).astype('uint8')).copy()
        ImageDraw.floodfill(hole, (x, y), 128)
        hh = np.asarray(hole) == 128
        # A seed that hits a large material region is ignored.
        if int(hh.sum()) < 2000:
            m = np.array(mask)
            m[hh] = 0
            mask = Image.fromarray(m)
mask.save(OUT / 'transparency-mask.png')

original = Image.open(OUT / 'teguh-adhi-wibowo-animated.gif')
count = original.n_frames
palette_frame = original.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT)
palette = palette_frame.getpalette()[:765] + [0, 0, 0]
palette_frame.putpalette(palette)
frames = []
preview_frames = []
for i in range(count):
    original.seek(i)
    rgb = original.convert('RGB')
    angle = 2.15 * math.sin(2 * math.pi * i / count)
    alpha = mask.rotate(angle, resample=Image.Resampling.BICUBIC,
                        center=(source.width/2, 0), fillcolor=0)
    alpha = alpha.resize(rgb.size, Image.Resampling.LANCZOS)
    opaque = np.asarray(alpha) >= 160
    indexed = rgb.quantize(palette=palette_frame, dither=Image.Dither.NONE)
    pixels = np.array(indexed)
    # Palette entry 255 is exclusively transparency, never an opaque black pixel.
    pixels[pixels == 255] = 0
    pixels[~opaque] = 255
    indexed = Image.fromarray(pixels, mode='P')
    indexed.putpalette(palette)
    indexed.info['transparency'] = 255
    frames.append(indexed)
    if i in [0, 30, 60, 90]:
        rgba = rgb.convert('RGBA')
        rgba.putalpha(Image.fromarray(np.where(opaque, 255, 0).astype('uint8')))
        bg = Image.new('RGB', rgb.size, (238, 239, 242))
        bd = ImageDraw.Draw(bg)
        for y in range(0, rgb.height, 24):
            for x in range(0, rgb.width, 24):
                if (x//24+y//24)%2:
                    bd.rectangle((x,y,x+23,y+23),fill=(210,214,220))
        bg.paste(rgba, (0,0), rgba)
        preview_frames.append(bg)
    if i == 0:
        still = rgb.convert('RGBA')
        still.putalpha(Image.fromarray(np.where(opaque, 255, 0).astype('uint8')))
        still.save(OUT / 'teguh-badge-transparent.png')

dest = OUT / 'teguh-adhi-wibowo-transparent.gif'
frames[0].save(dest, save_all=True, append_images=frames[1:], duration=50,
               loop=0, transparency=255, background=255, disposal=2, optimize=False)
sheet = Image.new('RGB', (744*2,900*2))
for j, f in enumerate(preview_frames):
    sheet.paste(f, ((j%2)*744,(j//2)*900))
sheet.resize((992,1200)).save(OUT / 'transparent-check.jpg', quality=93)

# Decode the actual saved GIF to check disposal, opacity, duration, and looping.
with Image.open(dest) as check:
    assert check.n_frames == 120
    assert check.info['loop'] == 0
    duration = 0
    for i in range(check.n_frames):
        check.seek(i)
        duration += check.info.get('duration', 0)
        rgba = np.asarray(check.convert('RGBA'))
        assert rgba[899,0,3] == 0
        assert rgba[700,370,3] == 255
    assert duration == 6000
    print({'path':str(dest),'frames':check.n_frames,'duration_ms':duration,
           'transparent':True,'size_bytes':dest.stat().st_size})
