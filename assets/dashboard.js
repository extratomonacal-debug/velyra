import { configured, supabase } from "./db.js";
const $=id=>document.getElementById(id);
const app=$("app"),login=$("auth-screen"),loginStatus=$("login-status"),status=$("app-status"),editor=$("editor"),form=$("editor-form");
let kind="streamer",profiles=[],adminUser=null;
const fields=["name","handle","role","bio","photo_url","twitch_url","kick_url","youtube_url","tiktok_url","instagram_url","contact_url","sort_order"];
function message(el,value,error=false){el.textContent=value||"";el.classList.toggle("error",Boolean(error))}
function labelFor(kind){return kind==="streamer"?"streamer":"manager"}
function safePhoto(url){try{const u=new URL(url);return ["https:","http:"].includes(u.protocol)?u.href:null}catch{return null}}
function ele(tag,cls,txt){const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x}
async function adminCheck(){
 const {data:userData,error:userError}=await supabase.auth.getUser();
 if(userError||!userData?.user){login.classList.remove("hidden");app.classList.add("hidden");return false}
 const {data:authorized,error}=await supabase.from("velyra_admins").select("user_id").eq("user_id",userData.user.id).maybeSingle();
 if(error||!authorized){await supabase.auth.signOut();login.classList.remove("hidden");app.classList.add("hidden");message(loginStatus,"Acesso não autorizado. Pede ao administrador que associe o teu utilizador à VELYRA.",true);return false}
 adminUser=userData.user;login.classList.add("hidden");app.classList.remove("hidden");$("account-email").textContent=adminUser.email||"Administrador";await reload();return true
}
async function reload(){
 message(status,"A carregar perfis...");
 const {data,error}=await supabase.from("velyra_profiles").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false});
 if(error){message(status,"Não foi possível carregar os perfis: "+error.message,true);return}
 profiles=data||[];message(status,"");render()
}
function render(){
 document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.kind===kind));
 $("section-title").textContent=kind==="streamer"?"Streamers":"Managers";
 $("section-description").textContent="Gere os "+(kind==="streamer"?"criadores":"managers")+" apresentados no site.";
 $("create-button").textContent="+ Adicionar "+labelFor(kind);
 const filtered=profiles.filter(p=>p.kind===kind);
 $("count-total").textContent=filtered.length;
 $("count-public").textContent=filtered.filter(p=>p.published).length;
 $("count-hidden").textContent=filtered.filter(p=>!p.published).length;
 const term=$("search").value.trim().toLocaleLowerCase("pt-PT");
 const matches=filtered.filter(p=>(p.name+" "+(p.handle||"")).toLocaleLowerCase("pt-PT").includes(term));
 const list=$("profile-list");list.replaceChildren();
 if(!matches.length){list.append(ele("div","no-data",filtered.length?"Nenhum perfil corresponde à pesquisa.":"Ainda não existem perfis. Clica em Adicionar para criar o primeiro."));return}
 for(const p of matches){
  const row=ele("article","item");
  const photo=safePhoto(p.photo_url);
  if(photo){const img=ele("img","thumb");img.src=photo;img.alt="";img.loading="lazy";row.append(img)}
  else row.append(ele("div","thumb",p.name?.charAt(0).toUpperCase()||"?"));
  const body=ele("div","item-body");body.append(ele("h3","",p.name),ele("p","",p.handle||p.role||"Sem descrição"));row.append(body);
  row.append(ele("span","pill"+(p.published?" on":""),p.published?"● Publicado":"○ Oculto"));
  const actions=ele("div","row-actions");
  const edit=ele("button","subtle","Editar");edit.type="button";edit.addEventListener("click",()=>openEditor(p));
  const toggle=ele("button","subtle",p.published?"Ocultar":"Publicar");toggle.type="button";toggle.addEventListener("click",()=>changePublish(p));
  const del=ele("button","subtle danger","Eliminar");del.type="button";del.addEventListener("click",()=>remove(p));
  actions.append(edit,toggle,del);row.append(actions);list.append(row);
 }
}
function openEditor(p){
 form.reset();
 $("profile-id").value=p?.id||"";
 $("editor-title").textContent=p?"Editar "+labelFor(kind):"Adicionar "+labelFor(kind);
 for(const key of fields){if(key==="sort_order"){form.elements.namedItem(key).value=p?.[key]??0;continue}form.elements.namedItem(key).value=p?.[key]||""}
 form.elements.namedItem("published").checked=Boolean(p?.published);
 $("photo").value="";message($("editor-status"),"");editor.showModal()
}
async function changePublish(p){
 const {error}=await supabase.from("velyra_profiles").update({published:!p.published}).eq("id",p.id);
 if(error){message(status,error.message,true);return}
 message(status,!p.published?"Perfil publicado com sucesso.":"Perfil ocultado.");await reload()
}
async function remove(p){
 if(!confirm("Eliminar definitivamente o perfil de "+p.name+"?"))return;
 const {error}=await supabase.from("velyra_profiles").delete().eq("id",p.id);
 if(error){message(status,error.message,true);return}
 await reload();message(status,"Perfil eliminado.")
}
document.querySelectorAll(".nav-button").forEach(b=>b.addEventListener("click",()=>{kind=b.dataset.kind;$("search").value="";render()}));
$("search").addEventListener("input",render);
$("refresh").addEventListener("click",reload);
$("create-button").addEventListener("click",()=>openEditor(null));
$("close-editor").addEventListener("click",()=>editor.close());
$("cancel-editor").addEventListener("click",()=>editor.close());
$("logout").addEventListener("click",async()=>{await supabase.auth.signOut();adminUser=null;profiles=[];app.classList.add("hidden");login.classList.remove("hidden");form.reset()});
$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!configured)return;
 const btn=$("login-button");btn.disabled=true;message(loginStatus,"A verificar credenciais...");
 const {error}=await supabase.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 if(error){message(loginStatus,"Email ou palavra-passe incorretos.",true)}else{message(loginStatus,"");$("password").value="";await adminCheck()}
 btn.disabled=false;
});
form.addEventListener("submit",async e=>{
 e.preventDefault();const btn=$("save-button");btn.disabled=true;message($("editor-status"),"A guardar...");
 try{
  const fd=new FormData(form);const id=fd.get("id")||crypto.randomUUID();
  const record={id,kind,published:fd.get("published")==="on"};
  for(const key of fields){const value=String(fd.get(key)||"").trim();record[key]=key==="sort_order"?Math.max(0,Math.min(100000,Number(value)||0)):value||null}
  if(!record.name)throw Error("Indica um nome.");
  for(const key of fields.filter(x=>x.endsWith("_url"))){if(record[key]&&!safePhoto(record[key]))throw Error("O campo "+key+" precisa de um endereço http(s) válido.")}
  const photo=$("photo").files[0];
  if(photo){
   const extensions={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"};
   const extension=extensions[photo.type];
   if(!extension)throw Error("Escolhe uma imagem JPG, PNG ou WebP.");
   if(photo.size>5*1024*1024)throw Error("A imagem não pode ultrapassar 5 MB.");
   const path=id+"/"+crypto.randomUUID()+"."+extension;
   const {error:uploadError}=await supabase.storage.from("velyra-portraits").upload(path,photo,{contentType:photo.type,upsert:false});
   if(uploadError)throw uploadError;
   record.photo_url=supabase.storage.from("velyra-portraits").getPublicUrl(path).data.publicUrl;
  }
  const {error}=await supabase.from("velyra_profiles").upsert(record,{onConflict:"id"});
  if(error)throw error;
  editor.close();await reload();message(status,"Perfil guardado com sucesso.")
 }catch(err){message($("editor-status"),err.message||"Falha ao guardar.",true)}
 finally{btn.disabled=false}
});
let settingPassword=false;
function showPasswordSetup(){
 settingPassword=true;
 login.classList.remove("hidden");app.classList.add("hidden");
 $("login-form").classList.add("hidden");
 $("forgot-password").classList.add("hidden");
 $("password-form").classList.remove("hidden");
 message(loginStatus,"Define uma palavra-passe para concluir o acesso.");
}
$("password-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const pass=$("new-password").value;
 if(pass!==$("confirm-password").value){message($("password-status"),"As palavras-passe não coincidem.",true);return}
 if(pass.length<10){message($("password-status"),"Utiliza pelo menos 10 caracteres.",true);return}
 const btn=$("password-button");btn.disabled=true;
 const {error}=await supabase.auth.updateUser({password:pass});
 btn.disabled=false;
 if(error){message($("password-status"),error.message,true);return}
 $("password-form").classList.add("hidden");
 $("login-form").classList.remove("hidden");
 $("forgot-password").classList.remove("hidden");
 $("new-password").value="";$("confirm-password").value="";
 settingPassword=false;
 history.replaceState(null,"",location.pathname);
 message(loginStatus,"Palavra-passe definida. A abrir a dashboard...");
 await adminCheck();
});
$("forgot-password").addEventListener("click",async()=>{
 const email=$("email").value.trim();
 if(!email){message(loginStatus,"Introduz primeiro o teu email.",true);return}
 const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/pagante"});
 message(loginStatus,error?"Não foi possível enviar o email: "+error.message:"Se a conta existir, receberás um email para definir a palavra-passe.",Boolean(error));
});
if(!configured){
 message(loginStatus,"Configuração pendente: é necessário associar a base de dados Supabase da VELYRA.",true);
 $("login-button").disabled=true;
 $("forgot-password").disabled=true;
}else{
 const inviteLink=location.hash.includes("type=invite")||location.hash.includes("type=recovery")||location.search.includes("type=invite")||location.search.includes("type=recovery");
 supabase.auth.onAuthStateChange((event,session)=>{
  if(event==="PASSWORD_RECOVERY"||(event==="SIGNED_IN"&&inviteLink&&!settingPassword)){
   showPasswordSetup();
  }
 });
 (async()=>{
  const {data}=await supabase.auth.getSession();
  if(inviteLink&&data.session)showPasswordSetup();
  else if(!settingPassword)await adminCheck();
 })();
}
