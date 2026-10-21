// Download only the standard catalog thumbnails recorded in hevy-library.json.
import fs from 'node:fs/promises'
const rows=JSON.parse(await fs.readFile(new URL('../src/data/hevy-library.json',import.meta.url)))
let cursor=0,downloaded=0;const failed=[]
await Promise.all(Array.from({length:8},async()=>{while(cursor<rows.length){const row=rows[cursor++];if(!row.thumbnail_url)continue;const target=new URL(`../public/hevy/${row.id}.jpg`,import.meta.url);try{await fs.access(target);continue}catch{}try{const url=new URL(row.thumbnail_url);if(url.hostname!=='pump-app.s3.eu-west-2.amazonaws.com')throw Error('Unexpected image host');const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error(`HTTP ${response.status}`);await fs.writeFile(target,Buffer.from(await response.arrayBuffer()));downloaded++}catch(error){failed.push({id:row.id,error:String(error)})}}}))
console.log(JSON.stringify({catalog:rows.length,downloaded,failed}));if(failed.length)process.exitCode=1
