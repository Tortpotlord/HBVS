const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const VIDEO_FOLDER = 'C:\\Users\\Dell\\Documents\\FAMILY_TREE';
const HBVS_FOLDER = 'C:\\HBVS';

// --- IMPORTANT: /videos FIRST ---
app.get('/videos', (req,res)=>{
  const files = fs.existsSync(VIDEO_FOLDER) ? fs.readdirSync(VIDEO_FOLDER).filter(f=>f.toLowerCase().endsWith('.mp4')) : [];
  let html = `<div style="font-family:sans-serif;padding:15px;max-width:800px;margin:auto">
  <h1>📹 Videos - Separate Site</h1>
  <a href="/" style="padding:10px;background:black;color:white;text-decoration:none">← Back to Holy Bible Vector Space</a>
  <p>Proof: Videos play on http:// with no red warning</p><hr>`;
  html+=files.map(f=>`<b>${f}</b><br><video controls playsinline width="100%" style="max-width:700px" src="/file/${encodeURIComponent(f)}"></video><hr><br>`).join('');
  html+=`</div>`;
  res.send(html);
});
app.use('/file', express.static(VIDEO_FOLDER));

// --- HBVS MAIN SITE SECOND ---
app.use(express.static(HBVS_FOLDER));

// This will now show HBVS, not videos
app.get('/', (req,res)=>{
  const indexPath = path.join(HBVS_FOLDER, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`<h1>HBVS</h1><p>No index.html found in C:\\HBVS. Put Holy Bible Vector Space build here.</p><a href="/videos">Videos</a>`);
  }
});

app.listen(8080,'0.0.0.0',()=>{
  console.log('✅ HBVS: http://192.168.137.1:8080/');
  console.log('✅ VIDEOS: http://192.168.137.1:8080/videos');
  console.log('For this PC also: http://localhost:8080/');
});