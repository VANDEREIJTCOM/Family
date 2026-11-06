import base64,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
from reward_images import save_image,image_url,MAX_BYTES
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/b1sAAAAASUVORK5CYII=')
class ImageTests(unittest.TestCase):
 def setUp(self):self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
 def data(self,value=PNG,kind='png'):return 'data:image/'+kind+';base64,'+base64.b64encode(value).decode()
 def test_upload_content_addressing_url_and_bytes(self):
  url=save_image(self.root,self.data());self.assertEqual(image_url(url),url);self.assertEqual(save_image(self.root,self.data()),url)
  self.assertEqual((self.root/'reward-images'/url.split('/')[-1]).read_bytes(),PNG);self.assertEqual(len(list((self.root/'reward-images').iterdir())),1)
 def test_invalid_content_type_payload_path_and_size(self):
  for value in ('data:image/svg+xml;base64,PHN2Zz4=',self.data(b'<html>'),self.data(PNG,'jpeg'),'data:image/png;base64,***',None,self.data(b'X'*(MAX_BYTES+1))):
   with self.assertRaises(ValueError):save_image(self.root,value)
  for url in ('javascript:alert(1)','https://outside.example/a.png','/local/family-hub/reward-images/../../a.png','/local/family-hub/reward-images/no.png'):
   with self.assertRaises(ValueError):image_url(url)
  self.assertEqual(image_url(None),'')
 def test_failed_atomic_write_leaves_no_partial_image(self):
  with patch('reward_images.os.replace',side_effect=OSError('disk error')):
   with self.assertRaises(OSError):save_image(self.root,self.data())
  self.assertEqual(list((self.root/'reward-images').iterdir()),[])
if __name__=='__main__':unittest.main()
