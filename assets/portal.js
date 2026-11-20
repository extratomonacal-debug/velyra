(() => {
  "use strict";
  const overlay=document.getElementById("portal-overlay");
  const bubbles=document.getElementById("portal-bubbles");
  const caption=document.getElementById("portal-caption");
  if(!overlay||!bubbles||!caption)return;
  let running=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.addEventListener("click",async e=>{
    const link=e.target.closest("a.portal-link");
    if(!link||running||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    const section=document.getElementById(link.dataset.portal);
    if(!section)return;
    e.preventDefault();
    if(matchMedia("(prefers-reduced-motion: reduce)").matches){
      history.pushState(null,"","#"+section.id);
      section.scrollIntoView({block:"start",behavior:"instant"});
      return;
    }
    running=true;
    caption.textContent=section.id==="streamers"?"STREAMERS":"MANAGERS";
    bubbles.replaceChildren();
    overlay.classList.remove("out","active");
    // Force a clean transition on repeated clicks, even with cached CSS.
    void overlay.offsetWidth;
    for(let i=0;i<50;i++){
      const bubble=document.createElement("i");
      bubble.className="portal-bubble";
      bubble.style.setProperty("--x",(8+((i*47)%84))+"%");
      bubble.style.setProperty("--y",(5+((i*37)%90))+"%");
      bubble.style.setProperty("--size",(20+((i*23)%110))+"px");
      bubble.style.setProperty("--delay",((i*17)%45)/100+"s");
      bubble.style.setProperty("--dur",(0.9+(i%5)*.14)+"s");
      bubbles.appendChild(bubble);
    }
    overlay.classList.add("active");
    await sleep(1200);
    history.pushState(null,"","#"+section.id);
    section.scrollIntoView({block:"start",behavior:"instant"});
    section.classList.add("visible");
    await sleep(300);
    overlay.classList.add("out");
    await sleep(750);
    overlay.classList.remove("active","out");
    bubbles.replaceChildren();
    running=false;
  });
})();