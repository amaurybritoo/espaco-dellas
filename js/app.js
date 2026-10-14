const SUPABASE_URL='https://awlecfmaivubbxlfvysz.supabase.co';
const SUPABASE_KEY='sb_publishable_3p9Rdi65L_3RkKDAKYQRjw_FpF0wOOd';
const VIP='';
const DEFAULT={name:'Espaço Dellas',bio:'Seu estilo, do seu jeito. Entregamos em toda Manaus ✨',logo_url:'assets/logo.svg',background_url:'assets/background-dellas.svg',address:'Avenida Tancredo Neves, 6, Parque 10 de Novembro, Manaus — AM, Mini Shopping Mindu Center (na bola do Mindu, próximo à Construí), 69054-040, Brasil',whatsapp:'https://wa.me/5592993258071',instagram:'https://www.instagram.com/espacodellasam/',tiktok:'',vip:'',catalogo:'',location_query:'Mini Shopping Mindu Center, na bola do Mindu, próximo à Construí, Avenida Tancredo Neves, 6, Parque 10 de Novembro, Manaus, AM, 69054-040'};
const ICONS={
 catalogo:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M8 8a4 4 0 0 1 8 0"/><path d="M9 12h.01M15 12h.01"/></svg>`,
 whatsapp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="M20.1 11.5a8.1 8.1 0 0 1-12 7.05L4 20l1.45-4.15A8.1 8.1 0 1 1 20.1 11.5Z"/><path d="M9.05 8.55c.22 1.75 2 3.5 3.65 4.2l1.25-1.05 1.7.78c.23.1.34.37.25.6-.38.94-1.1 1.45-2.05 1.32-3.33-.46-6.06-3.2-6.52-6.52-.13-.95.38-1.67 1.32-2.05.23-.09.5.02.6.25l.78 1.7-1.05 1.25Z"/></svg>`,
 instagram:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.8" r=".8" fill="currentColor" stroke="none"/></svg>`,
 tiktok:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.7 3h2.8c.3 1.9 1.4 3.3 3.2 4v2.8c-1.2-.1-2.3-.5-3.3-1.1v6.1a6.2 6.2 0 1 1-5.3-6.1v2.9a3.4 3.4 0 1 0 2.6 3.2V3Z"/></svg>`,
 location:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
 youtube:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="4"/><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none"/></svg>`,
 link:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13.5 8.5 15a3.2 3.2 0 0 1-4.5-4.5l3-3A3.2 3.2 0 0 1 11.5 7"/><path d="m14 10.5 1.5-1.5A3.2 3.2 0 0 1 20 13.5l-3 3a3.2 3.2 0 0 1-4.5 0"/><path d="m8.5 12.5 7-1"/></svg>`,
 vip:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.1 4.25 4.69.68-3.4 3.31.8 4.67L12 13.7l-4.19 2.21.8-4.67-3.4-3.31 4.69-.68L12 3Z"/><path d="M7 18.2h10M8.5 21h7"/></svg>`
};
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function getJSON(path){const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{cache:'no-store',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Cache-Control':'no-cache','Pragma':'no-cache'}});if(!r.ok){let detail='';try{const body=await r.json();detail=body.message||body.details||body.hint||JSON.stringify(body)}catch{}throw new Error(`HTTP ${r.status}${detail?`: ${detail}`:''}`)}return r.json()}
async function getPrimarySettings(){
  // Evita depender de um filtro id=1 que pode falhar em esquemas antigos.
  try { const rows=await getJSON('link_page_settings?select=*&limit=20'); return (rows||[]).find(x=>String(x.id)==='1')||(rows||[])[0]||null; }
  catch(error){ console.error('[Espaço Dellas] Não foi possível ler link_page_settings:',error.message); throw error; }
}
async function getPrimaryLinks(){
  // Primeiro lê a tabela sem filtros de colunas que podem não existir no schema publicado.
  const rows=await getJSON('link_page_links?select=*&order=sort_order.asc');
  const active=(rows||[]).filter(x=>x.enabled===undefined||x.enabled===null||x.enabled===true||String(x.enabled)==='true');
  const hasProfileColumn=active.some(x=>Object.prototype.hasOwnProperty.call(x,'profile_id'));
  const primary=active.filter(x=>!hasProfileColumn||x.profile_id===null||x.profile_id==='');
  // Compatibilidade com bases antigas em que todos os cards já estão gravados sem profile_id nulo.
  const selected=primary.length?primary:active;
  return selected.sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
}
function currentSlug(){const m=location.pathname.match(/^\/loja\/([^/]+)/i);return m?decodeURIComponent(m[1]):new URLSearchParams(location.search).get('loja')}
function mapDestination(q){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving`}
function verifiedAddress(value){const raw=String(value||'');if(/Tancredo Neves\s*,?\s*1\b/i.test(raw))return DEFAULT.address;return raw||DEFAULT.address}
function verifiedLocation(value,address){const raw=String(value||'');if(/Tancredo Neves\s*,?\s*1\b/i.test(raw))return DEFAULT.location_query;return raw||address||DEFAULT.location_query}
function makeMap(q){const frame=document.getElementById('mapFrame');const link=document.getElementById('mapLink');const query=q||DEFAULT.location_query;const src=`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&hl=pt-BR&output=embed`;link.href=mapDestination(query);link.target='_blank';link.rel='noopener noreferrer';if(frame.dataset.mapQuery===query)return;frame.dataset.mapQuery=query;if(frame.src!==src)frame.src=src}
function loadMap(){const frame=document.getElementById('mapFrame');if(!frame)return;makeMap(frame.dataset.mapQuery||DEFAULT.location_query)}
function setupMap(){loadMap()}
function iconFor(type){const t=String(type||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(t.includes('whatsapp'))return ICONS.whatsapp;if(t.includes('instagram'))return ICONS.instagram;if(t.includes('tiktok'))return ICONS.tiktok;if(t.includes('youtube'))return ICONS.youtube;if(t.includes('vip'))return ICONS.vip;if(t.includes('local')||t.includes('mapa')||t.includes('endereco'))return ICONS.location;if(t.includes('catalog'))return ICONS.catalogo;return ICONS.link}
function isLegacyBrand(value){return /demasi\s*boutique/i.test(JSON.stringify(value||''))}
function renderLinks(s,rows,animate=true){
  // Use exatamente os dados salvos no Supabase. Não sobrescrever título, URL ou descrição por tipo.
  rows=(rows||[]).map(x=>({...x,subtitle:String(x.subtitle??x.description??'')}));
  const links=document.getElementById('links');
  let list=(rows||[]).filter(x=>x.enabled!==false&&String(x.url||'').trim()).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
  links.classList.toggle('no-intro',!animate);
  if(!list.length){
    links.innerHTML='<div class="links-empty" role="status">Nenhum link ativo no momento.</div>';
    return;
  }
  links.innerHTML=list.map((x,i)=>`<a class="link-card${x.type==='vip'?' vip-card':''}" href="${esc(x.url)}" style="--delay:${i*70}ms"><span class="link-shimmer"></span><span class="link-icon">${iconFor(x.type)}</span><span class="link-copy"><b>${esc(x.title)}</b>${x.subtitle?`<small>${esc(x.subtitle)}</small>`:''}</span>${x.type==='vip'?'<em class="vip-badge">EXCLUSIVO</em>':''}<span class="link-arrow">→</span></a>`).join('');
}
function formatAddress(value){const parts=String(value||DEFAULT.address).split(',').map(x=>x.trim()).filter(Boolean);if(parts.length>=4)return `${esc(parts[0])}, ${esc(parts[1])}<br>${esc(parts.slice(2,4).join(' • '))}<br>${esc(parts.slice(4).join(' • '))}`;return esc(value||DEFAULT.address)}
function apply(s){
 document.title=`${s.name||DEFAULT.name} • Links`;document.querySelector('meta[name="description"]').setAttribute('content',`${s.name||DEFAULT.name} — todos os nossos links em um só lugar.`);document.getElementById('name').textContent=s.name||DEFAULT.name;const bio=String(s.bio||DEFAULT.bio);document.getElementById('bio').textContent=/Peças para acompanhar seu estilo|Moda, estilo e essência|Seu próximo look favorito/i.test(bio)?DEFAULT.bio:bio;
 const logo=document.getElementById('logo');logo.src=s.logo_url||DEFAULT.logo_url;logo.alt=s.name||DEFAULT.name;const address=verifiedAddress(s.address);document.getElementById('address').innerHTML=formatAddress(address);
 /* O fundo oficial fica definido no CSS (:before e .backdrop); não o sobrescrever após a resposta do Supabase. */makeMap(verifiedLocation(s.location_query,address));
 document.getElementById('footerName').textContent=(s.name||DEFAULT.name).toUpperCase();document.getElementById('footerPhrase').textContent='Feito para realçar o seu jeito de ser.';document.getElementById('footerYear').textContent=new Date().getFullYear();
}
function createStars(){const box=document.getElementById('goldStars');if(!box)return;box.innerHTML='';for(let i=0;i<22;i++){const star=document.createElement('span');star.className='gold-star';star.textContent='✦';star.style.left=(Math.random()*100).toFixed(2)+'%';star.style.top=(-10-Math.random()*40).toFixed(2)+'%';star.style.setProperty('--fall', (11+Math.random()*9).toFixed(2)+'s');star.style.setProperty('--delay', (-Math.random()*18).toFixed(2)+'s');star.style.setProperty('--drift', ((Math.random()-.5)*70).toFixed(1)+'px');star.style.setProperty('--scale',(0.45+Math.random()*.55).toFixed(2));box.appendChild(star)}}
createStars();
async function boot(){
  // Não mostrar dados de exemplo antes da resposta do Supabase: evita o flash de conteúdo antigo.
  document.body.classList.remove('page-ready');
  const slug=currentSlug();
  let s={...DEFAULT},rows=[];
  if(slug){
    try {
      const profiles=await getJSON(`link_page_profiles?slug=eq.${encodeURIComponent(slug)}&enabled=eq.true&select=*`);
      if(profiles[0]&&!isLegacyBrand(profiles[0])){
        s={...s,...profiles[0]};
        rows=await getJSON(`link_page_links?profile_id=eq.${encodeURIComponent(profiles[0].id)}&select=*&order=sort_order.asc`);
        rows=(rows||[]).filter(x=>x.enabled===undefined||x.enabled===null||x.enabled===true||String(x.enabled)==='true');
      }
    } catch(e) { console.error('[ESPAÇO DELLAS · LINKS] falha ao carregar perfil:',e.message); }
  } else {
    const results=await Promise.allSettled([getPrimarySettings(),getPrimaryLinks()]);
    if(results[0].status==='fulfilled'){
      const settingRow=results[0].value;
      if(settingRow&&!isLegacyBrand(settingRow)) s={...s,...settingRow};
      else if(settingRow) console.warn('[ESPAÇO DELLAS · LINKS] configuração legada ignorada até a migração do Supabase.');
    } else console.error('[ESPAÇO DELLAS · LINKS] erro ao carregar configurações:',results[0].reason?.message||results[0].reason);
    if(results[1].status==='fulfilled') rows=results[1].value||[];
    else console.error('[ESPAÇO DELLAS · LINKS] erro ao carregar cards:',results[1].reason?.message||results[1].reason);
  }
  apply(s);
  renderLinks(s,rows,false);
  setupMap();
  document.body.classList.add('page-ready');
}
document.getElementById('shareBtn').addEventListener('click',async()=>{const b=document.getElementById('shareBtn'),label=b.querySelector('.share-label');try{if(navigator.share){await navigator.share({title:document.title,url:location.href});return}if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(location.href)}else{const ta=document.createElement('textarea');ta.value=location.href;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}b.classList.add('copied');if(label){label.textContent='Link copiado';setTimeout(()=>label.textContent='Compartilhar',1600)}setTimeout(()=>b.classList.remove('copied'),1600)}catch(e){if(e&&e.name!=='AbortError'){b.classList.add('copied');if(label){label.textContent='Toque para compartilhar';setTimeout(()=>label.textContent='Compartilhar',1800)}setTimeout(()=>b.classList.remove('copied'),1800)}}});boot();

// Microestrelas douradas: leves, aleatórias e não interativas.
(function createSparkles(){
  const field=document.getElementById('sparkleField');
  if(!field || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count=18;
  for(let i=0;i<count;i++){
    const s=document.createElement('span');
    s.className='sparkle';
    s.style.left=(Math.random()*100)+'%';
    s.style.setProperty('--dur',(10+Math.random()*9).toFixed(2)+'s');
    s.style.setProperty('--delay',(-Math.random()*18).toFixed(2)+'s');
    s.style.setProperty('--drift',(-28+Math.random()*56).toFixed(1)+'px');
    s.style.setProperty('--op',(0.34+Math.random()*0.42).toFixed(2));
    s.style.transform=`scale(${0.65+Math.random()*0.7})`;
    field.appendChild(s);
  }
})();

// Mini corações prateados: leves, responsivos e desativados para movimento reduzido.
(function createPetals(){
  const field=document.getElementById('petalRain');
  if(!field||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const count=46;
  for(let i=0;i<count;i++){
    const petal=document.createElement('span');
    petal.className='silver-petal';
    petal.textContent='♥';
    petal.setAttribute('aria-hidden','true');
    petal.style.left=(Math.random()*104-2).toFixed(1)+'%';
    petal.style.setProperty('--fall',(12+Math.random()*10).toFixed(2)+'s');
    petal.style.setProperty('--delay',(-Math.random()*25).toFixed(2)+'s');
    petal.style.setProperty('--drift',(-42+Math.random()*84).toFixed(1)+'px');
    petal.style.setProperty('--turn',(160+Math.random()*240).toFixed(0)+'deg');
    petal.style.setProperty('--size',(11+Math.random()*8).toFixed(1)+'px');
    field.appendChild(petal);
  }
})();

// Atualiza a página pública quando alterações são salvas no painel administrativo.
(function enablePublicRefresh(){
  let refreshing=false;
  async function refreshPublicData(){
    if(refreshing||document.visibilityState==='hidden')return;
    refreshing=true;
    try{
      const slug=currentSlug();
      if(slug){
        const profiles=await getJSON(`link_page_profiles?slug=eq.${encodeURIComponent(slug)}&enabled=eq.true&select=*`);
        if(profiles[0]){const profile=profiles[0];const rows=await getJSON(`link_page_links?profile_id=eq.${profile.id}&enabled=eq.true&select=*&order=sort_order.asc`);apply({...DEFAULT,...profile});renderLinks(profile,rows,false)}
      }else{
        const results=await Promise.allSettled([getPrimarySettings(),getPrimaryLinks()]);
        let config={...DEFAULT};
        if(results[0].status==='fulfilled'&&results[0].value&&!isLegacyBrand(results[0].value)) config={...config,...results[0].value};
        if(results[1].status==='fulfilled') renderLinks(config,results[1].value||[],false);
        if(results[0].status==='fulfilled') apply(config);
      }
    }catch(error){console.debug('[Espaço Dellas] atualização automática adiada',error)}
    finally{refreshing=false}
  }
  window.addEventListener('focus',refreshPublicData);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshPublicData()});
  window.setInterval(refreshPublicData,12000);
})();
