"""Index generated alpha cutouts. PNG pixels stay unchanged."""
from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1];directory=root/'assets/photoreal'
sheets={f'room-{key}':(f'room-{key}.png',5) for key in ['living','dining','kitchen','appliances','garden','bathroom','bedrooms','structure','effects']}
sheets['supplement']=('supplement.png',5)
for n in range(1,6):sheets[f'guest-{n}']=(f'guest-{n}.png',3)
for key,rows in [('guests-6-8',3),('guests-9-11',3),('guests-12-14',3),('guests-15-16',2)]:sheets[key]=(key+'.png',rows)
index={}
for key,(file,rows) in sheets.items():
 im=Image.open(directory/file).convert('RGBA');alpha=im.getchannel('A').point(lambda v:255 if v>=32 else 0)
 frames=[];anchors=[];column_boxes=[]
 for col in range(4):
  left,right=round(im.width*col/4),round(im.width*(col+1)/4)
  segment=alpha.crop((left,0,right,im.height))
  present=[segment.crop((0,y,segment.width,y+1)).getbbox() is not None for y in range(im.height)]
  runs=[];start=None
  for y,on in enumerate(present+[False]*10):
   if on and start is None:start=y
   if start is not None and not any(present[y:y+8]):
    if y-start>5:runs.append((start,y))
    start=None
  if len(runs)!=rows:raise ValueError(f'{file} column {col}: expected {rows} alpha-separated objects, got {runs}')
  boxes=[]
  for top,bottom in runs:
   x,y,r,b=segment.crop((0,top,segment.width,bottom)).getbbox();boxes.append([left+x,top+y,r-x,b-y])
  column_boxes.append(boxes)
 for row in range(rows):
  for col in range(4):
   x,y,w,h=column_boxes[col][row];frames.append([x,y,w,h])
   # Human head column supplies a stable articulation root; props use centre.
   points=[]
   if key.startswith('guest'):
    for sy in range(int(h*.02),max(1,int(h*.12))):
     for sx in range(w):
      if alpha.getpixel((x+sx,y+sy)):points.append(sx+.5)
   anchors.append({'x':sum(points)/len(points) if points else w/2,'y':h})
 index[key]={'file':file,'columns':4,'rows':rows,'frames':frames,'anchors':anchors,
             'referenceHeight':max(f[3] for f in frames),'imageWidth':im.width,'imageHeight':im.height,
             'sourceSHA256':hashlib.sha256((directory/file).read_bytes()).hexdigest()}
 print(file,len(frames),'cutouts')
mapping={}
def bind(key,row,types):
 for typ in types:mapping[str(typ)]={'sheet':key,'row':row}
for row,types in enumerate([[17],[18],[19],[20],[21]]):bind('room-living',row,types)
for row,types in enumerate([[22,23],[24],[25],[26,27,46],[28]]):bind('room-dining',row,types)
for row,types in enumerate([[29],[30],[31],[32],[33]]):bind('room-kitchen',row,types)
for row,types in enumerate([[34],[35],[36],[37],[39]]):bind('room-appliances',row,types)
for row,types in enumerate([[40],[41],[42],[43],[66]]):bind('room-garden',row,types)
for row,types in enumerate([[50],[51],[52],[53,54],[55,56]]):bind('room-bathroom',row,types)
for row,types in enumerate([[60,61],[58,59],[57],[68],[67]]):bind('room-bedrooms',row,types)
bind('room-structure',0,[62]);bind('room-structure',1,[73]);bind('room-structure',3,[69,71]);bind('room-structure',4,[70,72])
for row,types in enumerate([[63],[64],[65],[41],[38]]):bind('supplement',row,types)
guests={str(n):{'sheet':f'guest-{n}','row':0} for n in range(1,6)}
for start,end in [(6,8),(9,11),(12,14),(15,16)]:
 for n in range(start,end+1):guests[str(n)]={'sheet':f'guests-{start}-{end}','row':n-start}
result={'sheets':index,'props':mapping,'guests':guests,'coverage':'All 14 recovered room layouts; architecture elevations inferred. Guest gait uses native articulated photographic limbs, not unverified candidate walk rows.'}
(directory/'room-art-index.json').write_text(json.dumps(result,indent=2),encoding='utf8')
