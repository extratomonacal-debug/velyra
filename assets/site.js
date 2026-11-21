import { configured, supabase } from "./db.js";
document.querySelector("#year").textContent=String(new Date().getFullYear());
const observer=new IntersectionObserver(entries=>{for(const item of entries){if(item.isIntersecting){item.target.classList.add("visible");observer.unobserve(item.target);}}},{threshold:.08});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
function element(tag,cls,content){const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e;}
function safeUrl(str){try{const url=new URL(str);return ["https:","http:"].includes(url.protocol)?url.href:null;}catch{return null;}}
const prospects={
 Brasil:[["vaderffps","https://www.twitch.tv/vaderffps"],["rachaxp7","https://www.twitch.tv/rachaxp7"],["poderosobagual","https://www.twitch.tv/poderosobagual"],["dona","https://www.twitch.tv/dona"]],
 Espanha:[["topbonusio","https://www.twitch.tv/topbonusio"],["PlayerMakerTV","https://www.twitch.tv/PlayerMakerTV"],["Andypsx","https://kick.com/andypsx"],["Neburix","https://www.google.com/search?q=Neburix+streamer"]]
};
function countryGroup(title,flag,subtitle){
 const section=element("section","country-group");
 const header=element("div","country-header");
 const marker=element("span","country-flag",flag);
 const copy=element("div","country-copy");
 copy.append(element("h3","",title),element("p","",subtitle));
 header.append(marker,copy);section.append(header);
 const grid=element("div","grid country-grid");section.append(grid);
 return {section,grid};
}
function prospectCard(p){
 const card=element("article","profile prospect-profile");
 const handle=p[0].toLowerCase();
 const imageUrl=handle==="andypsx"?"https://unavatar.io/kick/andypsx":handle==="neburix"?null:"https://avatarsapi.com/twitch/"+encodeURIComponent(handle);
 const avatar=element("div","avatar prospect-avatar",p[0].slice(0,1).toUpperCase());
 if(imageUrl){
  const img=element("img","prospect-photo");
  img.src=imageUrl;img.alt="Imagem de perfil de "+p[0];img.loading="lazy";
  img.addEventListener("error",()=>img.replaceWith(avatar),{once:true});
  card.append(img);
 }else card.append(avatar);
 card.append(element("h3","",p[0]),element("div","role","Perfil em análise"));
 card.append(element("p","","Criador identificado para possível contacto. Sem parceria confirmada com a VELYRA."));
 const socials=element("div","socials"),a=element("a","social-button","Ver perfil ↗");
 a.href=p[1];a.target="_blank";a.rel="noopener noreferrer";socials.append(a);card.append(socials);
 return card;
}
const countryInfo=[["Portugal","🇵🇹"],["Brasil","🇧🇷"],["Espanha","🇪🇸"]];
let activeCountry="Portugal";
function makeCountryTabs(){
 const tabs=element("div","country-tabs");
 tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","Selecionar país dos streamers");
 for(const [country,flag] of countryInfo){
  const button=element("button","country-tab"+(country===activeCountry?" active":""),flag+" "+country);
  button.type="button";button.setAttribute("role","tab");button.id="tab-"+country;
  button.setAttribute("aria-selected",String(country===activeCountry));
  button.setAttribute("aria-controls","panel-"+country);
  button.addEventListener("click",()=>{
   activeCountry=country;
   tabs.querySelectorAll('[role="tab"]').forEach(b=>{const selected=b===button;b.classList.toggle("active",selected);b.setAttribute("aria-selected",String(selected));});
   document.querySelectorAll("#streamer-list .country-group").forEach(p=>{p.hidden=p.dataset.country!==country;});
  });
  tabs.append(button);
 }
 return tabs;
}
function display(list,kind){
 const target=document.getElementById(kind+"-list");target.replaceChildren();
 if(!list.length&&kind!=="streamer"){const e=element("div","empty");e.append(element("h3","",kind==="streamer"?"Novos streamers em breve.":"Conhece a equipa em breve."),element("p","","Os perfis confirmados vão aparecer aqui."));target.append(e);return;}
 let cardTarget=target;
 if(kind==="streamer"){target.append(makeCountryTabs());const pt=countryGroup("Portugal","🇵🇹","Criadores apresentados pela VELYRA");pt.section.dataset.country="Portugal";pt.section.id="panel-Portugal";pt.section.setAttribute("role","tabpanel");pt.section.setAttribute("aria-labelledby","tab-Portugal");pt.section.hidden=activeCountry!=="Portugal";target.append(pt.section);cardTarget=pt.grid;}
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
  cardTarget.append(card);
 }
 if(kind==="streamer"){for(const [country,flag] of [["Brasil","🇧🇷"],["Espanha","🇪🇸"]]){const group=countryGroup(country,flag,"Perfis em análise · sem representação confirmada");for(const p of prospects[country])group.grid.append(prospectCard(p));group.section.dataset.country=country;group.section.id="panel-"+country;group.section.setAttribute("role","tabpanel");group.section.setAttribute("aria-labelledby","tab-"+country);group.section.hidden=activeCountry!==country;target.append(group.section);}}
}
async function load(){
 if(!configured)return;
 const {data,error}=await supabase.from("velyra_profiles").select("id,kind,name,role,bio,photo_url,twitch_url,kick_url,youtube_url,tiktok_url,instagram_url,contact_url,sort_order").eq("published",true).order("sort_order",{ascending:true}).order("created_at",{ascending:false});
 if(error){console.error("Profiles request failed",error.code);return;}
 display(data.filter(p=>p.kind==="streamer"),"streamer");
 display(data.filter(p=>p.kind==="manager"),"manager");
}
load();
