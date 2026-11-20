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


/* Purple bubble portal navigation: respects reduced motion and native anchors */
const portal=document.getElementById("portal-overlay");
const bubbleLayer=document.getElementById("portal-bubbles");
const portalCaption=document.getElementById("portal-caption");
let portalBusy=false;
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
document.querySelectorAll(".portal-link").forEach(link=>{
 link.addEventListener("click",async event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||portalBusy)return;
  const id=link.dataset.portal;
  const target=document.getElementById(id);
  if(!target)return;
  event.preventDefault();
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
   history.pushState(null,"","#"+id);
   target.scrollIntoView({behavior:"instant",block:"start"});
   return;
  }
  portalBusy=true;
  portal.classList.remove("out","active");
  bubbleLayer.replaceChildren();
  portalCaption.textContent=id==="streamers"?"STREAMERS":"MANAGERS";
  for(let i=0;i<38;i++){
   const b=document.createElement("span");b.className="portal-bubble";
   b.style.setProperty("--x",((i*37+17)%100)+"%");
   b.style.setProperty("--y",((i*53+29)%100)+"%");
   b.style.setProperty("--size",(20+(i*31)%115)+"px");
   b.style.setProperty("--delay",((i*13)%32)/100+"s");
   b.style.setProperty("--dur",(0.85+(i%6)*.12)+"s");
   bubbleLayer.append(b);
  }
  portal.setAttribute("aria-hidden","true");
  portal.classList.add("active");
  await wait(1120);
  history.pushState(null,"","#"+id);
  target.scrollIntoView({behavior:"instant",block:"start"});
  target.classList.add("visible");
  await wait(280);
  portal.classList.add("out");
  await wait(740);
  portal.classList.remove("active","out");
  bubbleLayer.replaceChildren();
  portalBusy=false;
 });
});
