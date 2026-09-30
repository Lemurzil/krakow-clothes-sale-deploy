const grid=document.querySelector('#grid');
const statusFilter=document.querySelector('#statusFilter');
const categoryFilter=document.querySelector('#categoryFilter');
const dialog=document.querySelector('#itemDialog');
const dialogContent=document.querySelector('#dialogContent');
const closeDialog=document.querySelector('#closeDialog');
let items=[];

const money=n=>Number(n).toFixed(2)+' zł';
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));

async function init(){
  items=await fetch('/data/items.json').then(r=>r.json());
  [...new Set(items.map(i=>i.category))].sort().forEach(c=>{
    categoryFilter.insertAdjacentHTML('beforeend','<option>'+esc(c)+'</option>');
  });
  renderStats();
  render();
}
function renderStats(){
  const av=items.filter(i=>i.status==='AVAILABLE').length;
  const rv=items.filter(i=>i.status==='RESERVED').length;
  document.querySelector('#stats').innerHTML=
    '<div class="stat"><strong>'+items.length+'</strong><span>Total pieces</span></div>'+
    '<div class="stat"><strong>'+av+'</strong><span>Available</span></div>'+
    '<div class="stat"><strong>'+rv+'</strong><span>Reserved</span></div>';
}
function render(){
  const s=statusFilter.value,c=categoryFilter.value;
  const shown=items.filter(i=>(s==='ALL'||i.status===s)&&(c==='ALL'||i.category===c));
  grid.innerHTML=shown.length?shown.map(card).join(''):'<div class="empty">No items match these filters.</div>';
  grid.querySelectorAll('.card').forEach(el=>el.addEventListener('click',()=>openItem(el.dataset.id)));
}
function card(i){
  return '<article class="card" data-id="'+i.id+'">'+
    '<div class="photo"><img src="'+i.images[0]+'" alt="'+esc(i.name)+'" loading="lazy">'+
    '<span class="badge '+i.status.toLowerCase()+'">'+i.status+'</span></div>'+
    '<div class="card-body"><div class="meta">'+i.catalogNumber+' · '+esc(i.brand||i.category)+' · SIZE '+esc(i.size)+'</div>'+
    '<h3>'+esc(i.name)+'</h3><div class="price-row"><span class="price">'+money(i.price)+'</span>'+
    (i.originalPrice?'<span class="old">'+money(i.originalPrice)+'</span>':'')+'</div></div></article>';
}
function openItem(iid){
  const i=items.find(x=>x.id===iid); if(!i)return;
  const facts=[
    ['Status',i.status],['Brand',i.brand],['Size',i.size],['Colour',i.color],
    ['Condition',i.condition],['Material',i.material]
  ].filter(x=>x[1]);
  const gallery=i.images.map((x,n)=>'<img src="'+x+'" alt="'+esc(i.name)+' photo '+(n+1)+'">').join('');
  const factHtml=facts.map(f=>'<div class="fact"><span>'+esc(f[0])+'</span><strong>'+esc(f[1])+'</strong></div>').join('');
  const featureHtml=i.features&&i.features.length?'<ul class="features">'+i.features.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
  dialogContent.innerHTML='<div class="detail"><div class="gallery">'+gallery+'</div><div class="info">'+
    '<div class="detail-id">'+i.catalogNumber+' · '+esc(i.category)+'</div><h2>'+esc(i.name)+'</h2>'+
    '<div class="big-price">'+money(i.price)+(i.originalPrice?' <span class="old">'+money(i.originalPrice)+'</span>':'')+'</div>'+
    '<div class="fact-list">'+factHtml+'</div>'+featureHtml+
    '<button class="share" id="shareItem">Share / copy item</button></div></div>';
  dialog.showModal();
  document.querySelector('#shareItem').onclick=()=>shareItem(i);
}
async function shareItem(i){
  const text=i.catalogNumber+' — '+i.name+', size '+i.size+', '+money(i.price)+' · Kraków';
  if(navigator.share){try{await navigator.share({title:i.name,text:text,url:location.href});return}catch(e){}}
  await navigator.clipboard.writeText(text+' '+location.href);
  const b=document.querySelector('#shareItem');
  b.textContent='Copied';
  setTimeout(()=>b.textContent='Share / copy item',1400);
}
statusFilter.addEventListener('change',render);
categoryFilter.addEventListener('change',render);
closeDialog.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
init();
