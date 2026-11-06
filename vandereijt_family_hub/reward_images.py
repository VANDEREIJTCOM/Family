"""Local raster reward images; content-addressed filenames, no user paths."""
import base64
import binascii
import hashlib
import os
from pathlib import Path
import re
import struct
import tempfile

PREFIX = '/local/family-hub/reward-images/'
MAX_BYTES = 5 * 1024 * 1024

def image_url(value):
    if not value:return ''
    if not isinstance(value,str) or not re.fullmatch(re.escape(PREFIX)+r'[a-f0-9]{64}\.(?:png|jpg|webp)',value):
        raise ValueError('Kies een geüploade beloningsafbeelding')
    return value

def save_image(www_dir,value):
    if not isinstance(value,str) or len(value)>MAX_BYTES*4//3+128:
        raise ValueError('Afbeelding mag maximaal 5 MB zijn')
    match=re.fullmatch(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)',value)
    if not match:raise ValueError('Kies een PNG-, JPG- of WebP-afbeelding')
    try:raw=base64.b64decode(match[2],validate=True)
    except (ValueError,binascii.Error):raise ValueError('Ongeldige afbeelding') from None
    kind=match[1]
    valid={'png':len(raw)>=45 and raw.startswith(b'\x89PNG\r\n\x1a\n') and raw[12:16]==b'IHDR' and raw[-8:-4]==b'IEND',
           'jpeg':len(raw)>=32 and raw.startswith(b'\xff\xd8\xff') and raw.endswith(b'\xff\xd9'),
           'webp':len(raw)>=20 and raw.startswith(b'RIFF') and raw[8:12]==b'WEBP' and raw[12:16] in (b'VP8 ',b'VP8L',b'VP8X') and int.from_bytes(raw[4:8],'little')+8==len(raw)}
    if not raw or len(raw)>MAX_BYTES or not valid[kind]:raise ValueError('De inhoud is geen geldige PNG-, JPG- of WebP-afbeelding')
    if kind=='png':
        width,height=struct.unpack('>II',raw[16:24])
        if not width or not height or width*height>50000000:raise ValueError('Kies een kleinere afbeelding')
    ext='jpg' if kind=='jpeg' else kind;name=hashlib.sha256(raw).hexdigest()+'.'+ext
    directory=Path(www_dir)/'reward-images';directory.mkdir(parents=True,exist_ok=True)
    path=directory/name
    if not path.exists():
        temporary=None
        try:
            with tempfile.NamedTemporaryFile(dir=directory,prefix='.upload-',delete=False) as file:
                temporary=file.name;file.write(raw);file.flush();os.fsync(file.fileno())
            os.replace(temporary,path)
        finally:
            if temporary and os.path.exists(temporary):os.unlink(temporary)
    return PREFIX+name
