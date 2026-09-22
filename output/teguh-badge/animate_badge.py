from pathlib import Path
import math
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).parent
SOURCE = Path(r'C:\Users\csm11\.codex\generated_images\01a0c865-6192-7d21-a4c1-a4472780e434\exec-6b895bef-e0eb-4a26-a3ad-1618016d5e46.png')
shutil.copy2(SOURCE, OUT / 'teguh-badge-still.png')
base = Image.open(SOURCE).convert('RGB')
W, H = base.size
N = 120
FPS = 20

def curve(points, steps=25):
    p = np.array(points, dtype=float)
    t = np.linspace(0, 1, steps)[:, None]
    q = (1-t)**3*p[0]+3*(1-t)**2*t*p[1]+3*(1-t)*t*t*p[2]+t**3*p[3]
    return [tuple(v) for v in q]

def skin_patch(im, box, color, ellipse=False):
    x0,y0,x1,y1 = box
    rng = np.random.default_rng(11)
    noise = rng.normal(0, .8, (y1-y0,x1-x0,1))
    patch = Image.fromarray(np.clip(np.array(color)[None,None,:]+noise,0,255).astype('uint8'))
    mask = Image.new('L', patch.size)
    d = ImageDraw.Draw(mask)
    if ellipse:
        d.ellipse((2,2,x1-x0-3,y1-y0-3),fill=255)
    else:
        d.rounded_rectangle((2,2,x1-x0-3,y1-y0-3),radius=7,fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.3))
    im.paste(patch,(x0,y0),mask)

clean = base.copy()
skin_patch(clean,(502,735,579,777),(239,239,240))
skin_patch(clean,(494,682,518,712),(240,240,240),True)
skin_patch(clean,(564,679,588,709),(239,239,239),True)

cropbox = (433,550,678,838)
cw,ch = cropbox[2]-cropbox[0],cropbox[3]-cropbox[1]
yy,xx = np.mgrid[:ch,:cw].astype(float)
gx,gy = xx+cropbox[0],yy+cropbox[1]

def g(cx,cy,sx,sy):
    return np.exp(-.5*(((gx-cx)/sx)**2+((gy-cy)/sy)**2))

def remap(im, dx,dy):
    a=np.asarray(im,dtype=float)
    sx=np.clip(xx-dx,0,cw-1.001); sy=np.clip(yy-dy,0,ch-1.001)
    x0=sx.astype(int); y0=sy.astype(int)
    fx=(sx-x0)[...,None]; fy=(sy-y0)[...,None]
    v=a[y0,x0]*(1-fx)*(1-fy)+a[y0,x0+1]*fx*(1-fy)+a[y0+1,x0]*(1-fx)*fy+a[y0+1,x0+1]*fx*fy
    return Image.fromarray(np.clip(v,0,255).astype('uint8'))

def blink(t,center):
    dist=abs((t-center+3)%6-3)
    return math.exp(-(dist/.095)**4)

def frame(i):
    t=i/FPS
    p=2*math.pi*i/N
    im=clean.copy()
    d=ImageDraw.Draw(im)
    # Articulated open/closed mouth, with tiny pauses between phrases.
    syllable=(.5+.5*math.sin(15*p+.65*math.sin(3*p)))**1.25
    envelope=.4+.6*(.5+.5*math.sin(2*p-.4))
    opening=syllable*envelope
    width=48+9*math.sin(7*p+.5)**2
    cx=540+1.1*math.sin(3*p)
    left=(cx-width/2,747); right=(cx+width/2,741.5)
    top=curve([left,(cx-10,749),(cx+13,746),right])
    depth=3+26*opening
    bottom=curve([right,(cx+width*.32,751+depth),(cx-width*.3,757+depth),left])
    d.polygon(top+bottom,fill=(9,10,10))
    if opening>.14:
        # Upper teeth follow the same smile arc.
        a=(left[0]+5,left[1]+3); b=(right[0]-6,right[1]+4)
        teeth=curve([a,(cx-8,751),(cx+10,748),b])+curve([b,(cx+12,752+min(4,depth*.2)),(cx-8,756+min(4,depth*.2)),a])
        d.polygon(teeth,fill=(246,246,244))
    if opening>.65:
        tongue=curve([(cx-9,754+depth*.62),(cx-3,750+depth*.63),(cx+7,749+depth*.63),(cx+12,751+depth*.62)])
        tongue+=curve([tongue[-1],(cx+7,755+depth*.68),(cx-3,758+depth*.68),tongue[0]])
        d.polygon(tongue,fill=(161,162,160))
    closure=max(blink(t,1.4),blink(t,4.65))
    for ex,ey in [(506,697),(576,694)]:
        eyeheight=8.5*(1-closure)
        gaze=1.0*math.sin(2*p)
        if eyeheight>1.7:
            d.ellipse((ex-6+gaze,ey-eyeheight,ex+6+gaze,ey+eyeheight),fill=(5,6,6))
        else:
            pts=curve([(ex-9,ey),(ex-3,ey+3),(ex+4,ey+3),(ex+10,ey-1)])
            d.line(pts,fill=(9,10,10),width=3)
    # Deform the portrait locally so the brows and cheeks move independently.
    dx=1.5*math.sin(2*p)*g(553,688,77,103)
    dy=1.6*math.sin(3*p)*g(553,698,85,104)
    dy+=(-3.4*math.sin(3*p+.2))*g(501,660,18,6.5)
    dy+=(-3.0*math.sin(3*p+.65))*g(567,657,23,6.5)
    cheek=1.4*math.sin(15*p+.65*math.sin(3*p))
    dx-=cheek*g(489,744,14,17)
    dx+=cheek*g(594,744,17,19)
    dy-=opening*1.8*(g(489,744,15,18)+g(594,744,17,19))
    # Fade the displacement to exactly zero along crop boundaries.
    edge=np.minimum.reduce([xx,cw-1-xx,yy,ch-1-yy])
    fade=np.clip(edge/18,0,1)
    im.paste(remap(im.crop(cropbox),dx*fade,dy*fade),cropbox[:2])
    angle=2.15*math.sin(p)
    im=im.rotate(angle,resample=Image.Resampling.BICUBIC,center=(W/2,0),fillcolor=(0,0,0))
    return im.resize((744,900),Image.Resampling.LANCZOS)

frames=[]
for i in range(N):
    frames.append(frame(i))
    if i%30==0: print(f'Rendered {i}/{N}',flush=True)

# Shared palette avoids colors flickering between frames.
palette=frames[0].quantize(colors=192,method=Image.Quantize.MEDIANCUT)
indexed=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
path=OUT/'teguh-adhi-wibowo-animated.gif'
indexed[0].save(path,save_all=True,append_images=indexed[1:],duration=50,loop=0,optimize=True,disposal=1)
frames[0].save(OUT/'teguh-badge-preview.png')
# Contact sheet makes eye/mouth extremes and the pendulum limits reviewable.
indices=[0,15,28,45,60,75,93,105]
sheet=Image.new('RGB',(4*372,2*450))
for j,i in enumerate(indices):
    sheet.paste(frames[i].resize((372,450)),((j%4)*372,(j//4)*450))
sheet.save(OUT/'animation-contact-sheet.jpg',quality=92)
detail=Image.new('RGB',(4*245,2*288))
for j,i in enumerate(indices):
    # Inverse sway restores the same facial crop for comparison.
    r=frames[i].resize((W,H)).rotate(-2.15*math.sin(2*math.pi*i/N),resample=Image.Resampling.BICUBIC,center=(W/2,0))
    detail.paste(r.crop(cropbox),((j%4)*245,(j//4)*288))
detail.save(OUT/'expression-contact-sheet.jpg',quality=95)
with Image.open(path) as gif:
    duration=sum(gif.seek(i) or gif.info.get('duration',0) for i in range(gif.n_frames))
    print({'file':str(path),'frames':gif.n_frames,'size':gif.size,'duration_ms':duration,'loop':gif.info.get('loop'),'bytes':path.stat().st_size},flush=True)
arr0=np.asarray(frames[0],dtype=float); arrlast=np.asarray(frames[-1],dtype=float)
print('Loop seam mean absolute difference:',np.abs(arr0-arrlast).mean(),flush=True)
