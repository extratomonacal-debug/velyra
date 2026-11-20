import { configured, supabase } from "./db.js";
document.querySelector("#year").textContent=String(new Date().getFullYear());
const observer=new IntersectionObserver(entries=>{for(const item of entries){if(item.isIntersecting){item.target.classList.add("visible");observer.unobserve(item.target);}}},{threshold:.08});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
function element(tag,cls,content){const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e;}
function safeUrl(str){try{const url=new URL(str);return ["https:","http:"].includes(url.protocol)?url.href:null;}catch{return null;}}
function display(list,kind){
 const target=document.getElementById(kind+"-list");target.replaceChildren();
 if(!list.length){const e=element("div","empty");e.append(element("h3","",kind==="streamer"?"Novos streamers em breve.":"Conhece a equipa em breve."),element("p","","Os perfis confirmados vão aparecer aqui."));target.append(e);return;}
 for(const entry of list){
  const card=element("article","profile");
  if(safeUrl(entry.photo_url)){const img=element("img");img.src=safeUrl(entry.photo_url);img.alt="Fotografia de "+entry.name;img.loading="lazy";img.referrerPolicy="no-referrer";img.addEventListener("error",()=>{const avatar=element("div","avatar",entry.name.trim().slice(0,1).toUpperCase());img.replaceWith(avatar)},{once:true});card.append(img);}
  else{const a=element("div","avatar",entry.name.trim().slice(0,1).toUpperCase());card.append(a);}
  card.append(element("h3","",entry.name));
  if(entry.role)card.append(element("div","role",entry.role));
  if(entry.bio)card.append(element("p","",entry.bio));
  const socials=element("div","socials");
  for(const [key,label] of [["twitch_url","Twitch"],["kick_url","Kick"],["youtube_url","YouTube"],["tiktok_url","TikTok"],["instagram_url","Instagram"],["contact_url","Contacto"]]){
    const u=safeUrl(entry[key]);if(!u)continue;
    const a=element("a","social-button social-"+key.replace("_url",""),label);a.href=u;a.rel="noopener noreferrer";a.target="_blank";a.setAttribute("aria-label","Abrir "+label+" de "+entry.name);const arrow=element("span","social-arrow","↗");a.append(arrow);socials.append(a);
  }
  if(socials.children.length)card.append(socials);
  target.append(card);
 }
}
async function load(){
 if(!configured)return;
 const {data,error}=await supabase.from("velyra_profiles").select("id,kind,name,role,bio,photo_url,twitch_url,kick_url,youtube_url,tiktok_url,instagram_url,contact_url,sort_order").eq("published",true).order("sort_order",{ascending:true}).order("created_at",{ascending:false});
 if(error){console.error("Profiles request failed",error.code);return;}
 display(data.filter(p=>p.kind==="streamer"),"streamer");
 display(data.filter(p=>p.kind==="manager"),"manager");
}
load();
