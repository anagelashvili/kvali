// Demo artists (flagged is_demo and labelled on the site; requests to them are
// never stored) whose works are the prototype's generated ink art as images.
//   node --env-file=.env.local scripts/seed-demo.mjs
//   node --env-file=.env.vercel.local scripts/seed-demo.mjs --hosted   (the live database)
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

if (!/127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_SUPABASE_URL) && !process.argv.includes("--hosted")) {
  throw new Error("Not a local database; pass --hosted to seed the live one");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const STYLES = ["fine-line", "old-school", "blackwork", "japanese", "realism", "dotwork", "watercolor"];
const FEEL = [[.15,.2,.05,.2],[.7,.5,.8,.5],[.85,.7,0,.7],[.8,.95,.7,.95],[.5,.6,.3,.7],[.4,.8,0,.5],[.2,.4,.95,.5]];
const VIBES = ["traveler", "nature", "floral", "animals", "minimal", "dark", "geometric", "mythology"];
const ARTISTS = [
  ["Nino Kapanadze", "Ink Garden", [0, 6]], ["Luka Meladze", "Old Town Tattoo", [1, 2]],
  ["Tamar Beridze", "Ghost Needle", [2, 5]], ["Giorgi Datuashvili", "Kazbegi Ink", [3, 4]],
  ["Mariam Sulava", "Ink Garden", [0, 5]], ["Sandro Tsiklauri", "Rustaveli Studio", [4, 3]],
];

function rng(s){return function(){s=(s*16807)%2147483647;return(s-1)/2147483646}}
function art(si,seed){
  var r=rng(seed*97+si*13+7),g="",f='<feGaussianBlur stdDeviation="0"/>',i,k,j,a;
  if(si<4)f='<feTurbulence type="fractalNoise" baseFrequency=".02 .03" numOctaves="2" seed="'+seed+'"/><feDisplacementMap in="SourceGraphic" scale="'+[18,10,34,26][si]+'"/>';
  if(si==0)for(i=0;i<5;i++)g+='<path fill="none" stroke-width="1.6" d="M'+(40+r()*60)+" "+(340-i*10)+"C"+r()*300+" "+r()*400+" "+r()*300+" "+r()*400+" "+(200+r()*80)+" "+(40+r()*80)+'"/>';
  if(si==1)g='<circle cx="150" cy="190" r="'+(60+r()*40)+'" fill="none" stroke-width="14"/><path fill="none" stroke-width="12" d="M70 110L230 270M230 110L70 270"/>';
  if(si==2)g='<circle cx="150" cy="190" r="'+(70+r()*50)+'"/><rect x="'+(60+r()*30)+'" y="320" width="'+(120+r()*60)+'" height="22"/><rect x="40" y="50" width="22" height="'+(120+r()*100)+'"/>';
  if(si==3)for(i=0;i<6;i++)g+='<path fill="none" stroke-width="5" d="M10 '+(120+i*40)+"Q"+(75+r()*20)+" "+(60+i*40)+" 150 "+(120+i*40)+"T290 "+(120+i*40)+'"/>';
  if(si==4||si==6){f='<feGaussianBlur stdDeviation="'+(si==4?14:24)+'"/>';for(i=0;i<4;i++)g+='<ellipse cx="'+(60+r()*180)+'" cy="'+(80+r()*240)+'" rx="'+(40+r()*60)+'" ry="'+(50+r()*70)+'" stroke="none" opacity="'+(si==4?.9:.45)+'"/>'}
  if(si==5)for(k=1;k<=6;k++)for(j=0,a=k*8;j<a;j++)g+='<circle cx="'+(150+k*20*Math.cos(j/a*6.2832)).toFixed(1)+'" cy="'+(190+k*20*Math.sin(j/a*6.2832)).toFixed(1)+'" r="2.4" stroke="none"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 300 400"><rect width="300" height="400" fill="#EDE8DC"/><defs><filter id="f" x="-30%" y="-30%" width="160%" height="160%">'+f+'</filter></defs><g filter="url(#f)" fill="#0E0E0E" stroke="#0E0E0E" stroke-linecap="round">'+g+'</g></svg>';
}

const r = rng(5);
let seed = 1;
for (const [name, studio, styleIdx] of ARTISTS) {
  const email = `demo-${name.split(" ")[0].toLowerCase()}@example.com`;
  let { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === email);
  if (!user) user = (await db.auth.admin.createUser({ email, email_confirm: true })).data.user;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  await db.from("works").delete().eq("artist_id", user.id);
  await db.from("artists").upsert({ id: user.id, slug, display_name: name, studio, status: "approved", is_demo: true,
    instagram: slug.replace(/-/g, "."), price_from: 150 + Math.round(r() * 3) * 50, price_to: 600 + Math.round(r() * 6) * 100,
    languages: ["ka", "en"], bio_en: "Demo profile: generated sample work so you can try Kvali before real artists join." });
  for (let n = 0; n < 4; n++) {
    const si = styleIdx[n % 2];
    const png = await sharp(Buffer.from(art(si, seed++))).webp({ quality: 82 }).toBuffer();
    const thumb = await sharp(png).resize(640).webp({ quality: 78 }).toBuffer();
    const id = crypto.randomUUID();
    await db.storage.from("works").upload(`${user.id}/${id}.webp`, png, { contentType: "image/webp", upsert: true });
    await db.storage.from("works").upload(`${user.id}/${id}-thumb.webp`, thumb, { contentType: "image/webp", upsert: true });
    const jitter = (x) => Math.round(Math.max(0, Math.min(1, x + (r() - 0.5) * 0.3)) * 100);
    const [fw, fd, fc, fs] = FEEL[si].map(jitter);
    await db.from("works").insert({ id, artist_id: user.id, image_path: `${user.id}/${id}.webp`, thumb_path: `${user.id}/${id}-thumb.webp`,
      width: 600, height: 800, position: n, feel_weight: fw, feel_detail: fd, feel_color: fc, feel_scale: fs });
    await db.from("work_tags").insert([{ work_id: id, tag: STYLES[si] }, { work_id: id, tag: VIBES[Math.floor(r() * VIBES.length)] }]);
  }
  console.log("seeded", slug);
}
