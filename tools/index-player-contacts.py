"""Index approved contact poses without changing their generated PNG pixels."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib

root = Path(__file__).resolve().parents[1]
assets = root / 'assets/photoreal'
specs = [('front', 'player-contact-front.png', 2),
         ('rightA', 'player-contact-right-a.png', 1),
         ('back', 'player-contact-back.png', 2),
         ('left', 'player-contact-left.png', 2),
         ('rightB', 'player-contact-right-b.png', 1)]
sources = {}
for key, filename, columns in specs:
    image = Image.open(assets / filename).convert('RGBA')
    mask = image.getchannel('A').point(lambda a: 255 if a >= 32 else 0)
    frames, anchors = [], []
    for col in range(columns):
        left, right = round(col*image.width/columns), round((col+1)*image.width/columns)
        box = mask.crop((left, 0, right, image.height)).getbbox()
        x,y,r,b = box
        x += left; r += left
        w,h = r-x,b-y
        points = [sx+.5 for sy in range(int(h*.02),int(h*.12)) for sx in range(w)
                  if mask.getpixel((x+sx,y+sy))]
        frames.append([x,y,w,h]); anchors.append({'x':sum(points)/len(points),'y':h})
    sources[key] = {'file':filename, 'columns':columns, 'rows':1,
                    'frames':frames,'anchors':anchors,
                    'sourceSHA256':hashlib.sha256((assets/filename).read_bytes()).hexdigest()}
# Anatomical sides refer to the character, not the screen.
poses = [[['front',0],['front',1]], [['rightA',0],['rightB',0]],
         [['back',0],['back',1]], [['left',0],['left',1]]]
result = {'sources':sources,'directions':['front','right','back','left'],
          'phases':['left leg forward / right arm forward','right leg forward / left arm forward'],
          'poses':poses,'phaseMilliseconds':280,
          'acceptance':'Visual limb-continuity review; image hashes alone do not prove gait.'}
(assets/'player-contacts.json').write_text(json.dumps(result,indent=2),encoding='utf8')
# Requested labelled evidence sheet, not a production texture modification.
sheet = Image.new('RGB',(1000,1000),'#e6e6e6'); draw=ImageDraw.Draw(sheet)
for direction, pair in enumerate(poses):
    for phase,(source,col) in enumerate(pair):
        meta=sources[source];im=Image.open(assets/meta['file']).convert('RGBA')
        x,y,w,h=meta['frames'][col];crop=im.crop((x,y,x+w,y+h));crop.thumbnail((210,400))
        ox=direction*250+(250-crop.width)//2;oy=phase*500+70
        sheet.paste(crop,(ox,oy),crop)
        draw.text((direction*250+8,phase*500+8),result['directions'][direction].upper(),fill='black')
        draw.text((direction*250+8,phase*500+27),'A: LEFT leg forward' if phase==0 else 'B: RIGHT leg forward',fill='black')
        draw.text((direction*250+8,phase*500+44),'RIGHT arm forward' if phase==0 else 'LEFT arm forward',fill='black')
sheet.save(root.parent/'evidence/player-contact-acceptance.png')
print('Indexed eight approved contact poses; produced labelled visual evidence.')
