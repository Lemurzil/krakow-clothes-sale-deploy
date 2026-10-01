const grid=document.querySelector('#grid');
const searchInput=document.querySelector('#searchInput');
const categoryChips=document.querySelector('#categoryChips');
const summaryLine=document.querySelector('#summaryLine');
const topCount=document.querySelector('#topCount');
const resultsTitle=document.querySelector('#resultsTitle');
const resultCount=document.querySelector('#resultCount');
const dialog=document.querySelector('#itemDialog');
const dialogContent=document.querySelector('#dialogContent');
const closeDialog=document.querySelector('#closeDialog');

let items=[];
let activeCategory='ALL';

const money=n=>Number(n).toFixed(2)+' zÅ‚';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

const categoryAliases={
  'Jackets':'jacket jackets coat coats kurtka kurtki plaszcz outerwear',
  'Shirts':'shirt shirts koszula koszule button up',
  'Sweaters':'sweater sweaters jumper jumpers sweter swetry christmas',
  'T-Shirts':'tshirt t-shirt tee koszulka koszulki',
  'Shoes':'shoe shoes sneaker sneakers trainers buty obuwie',
  'Accessories':'accessory accessories cap hat czapka czapki'
};
function searchText(i){
  return norm([
    i.id,i.catalogNumber,i.name,i.brand,i.size,i.color,i.category,
    i.condition,i.material,...(i.features||[]),categoryAliases[i.category]||''
  ].join(' '));
}

async function init(){
  items=await fetch('/data/items.json').then(r=>r.json());
  items.forEach(i=>i._search=searchText(i));
  renderHeader();
  renderChips();
  render();
}

function renderHeader(){
  const available=items.filter(i=>i.status==='AVAILABLE').length;
  summaryLine.textContent=available+' available Â· '+items.length+' total Â· prices in PLN Â· search by name / number';
  topCount.textContent=available+' available Â· '+items.length+' total';
}

function renderChips(){
  const categories=[...new Set(items.map(i=>i.category))].sort();
  const all=[['ALL','All'],...categories.map(c=>[c,c])];
  categoryChips.innerHTML=all.map(([value,label])=>
    '<button class="chip '+(value===activeCategory?'active':'')+'" data-category="'+esc(value)+'">'+esc(label)+'</button>'
  ).join('');
  categoryChips.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click',()=>{
      activeCategory=btn.dataset.category;
      renderChips();
      render();
    });
  });
}
function matchesQuery(i,q){
  if(!q)return true;
  const nq=norm(q);
  if(i._search.includes(nq))return true;
  const digits=nq.replace(/^#/,'');
  if(/^\d+$/.test(digits)){
    return i.id.includes(digits.padStart(Math.min(3,digits.length+1),'0')) ||
      i.id.endsWith(digits) || i.catalogNumber.includes('#'+digits);
  }
  return nq.split(/\s+/).every(term=>i._search.includes(term));
}

function render(){
  const q=searchInput.value;
  const shown=items
    .filter(i=>(activeCategory==='ALL'||i.category===activeCategory)&&matchesQuery(i,q))
    .sort((a,b)=>{
      const order={AVAILABLE:0,RESERVED:1,SOLD:2};
      return (order[a.status]??9)-(order[b.status]??9)||a.id.localeCompare(b.id);
    });

  const searching=q.trim().length>0;
  resultsTitle.textContent=searching?'Search results':(activeCategory==='ALL'?(shown.every(i=>i.status==='AVAILABLE')?'Available':'All items'):activeCategory);
  resultCount.textContent=shown.length+' '+(shown.length===1?'item':'items');
  grid.innerHTML=shown.length?shown.map(card).join(''):
    '<div class="empty"><strong>No matches.</strong><span>Try a name, brand, type, size or item number such as #012.</span></div>';
  grid.querySelectorAll('.card').forEach(el=>el.addEventListener('click',()=>openItem(el.dataset.id)));
}

function card(i){
  const status=i.status==='AVAILABLE'?'':'<span class="badge '+i.status.toLowerCase()+'">'+i.status+'</span>';
  return '<article class="card" data-id="'+i.id+'" tabindex="0">'+
    '<div class="photo"><img src="'+i.images[0]+'" alt="'+esc(i.name)+'" loading="lazy">'+status+'</div>'+
    '<div class="card-body"><div class="meta">'+i.catalogNumber+' Â· '+esc(i.brand||i.category)+' Â· SIZE '+esc(i.size)+'</div>'+
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
  const featureHtml=i.features?.length?'<ul class="features">'+i.features.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
  dialogContent.innerHTML='<div class="detail"><div class="gallery">'+gallery+'</div><div class="info">'+
    '<div class="detail-id">'+i.catalogNumber+' Â· '+esc(i.category)+'</div><h2>'+esc(i.name)+'</h2>'+
    '<div class="big-price">'+money(i.price)+(i.originalPrice?' <span class="old">'+money(i.originalPrice)+'</span>':'')+'</div>'+
    '<div class="fact-list">'+factHtml+'</div>'+featureHtml+
    '<button class="share" id="shareItem">Share / copy item</button></div></div>';
  dialog.showModal();
  document.querySelector('#shareItem').onclick=()=>shareItem(i);
}

async function shareItem(i){
  const text=i.catalogNumber+' â€” '+i.name+', size '+i.size+', '+money(i.price)+' Â· KrakÃ³w';
  if(navigator.share){try{await navigator.share({title:i.name,text,url:location.href});return}catch(e){}}
  await navigator.clipboard.writeText(text+' '+location.href);
  const b=document.querySelector('#shareItem');
  b.textContent='Copied';
  setTimeout(()=>b.textContent='Share / copy item',1400);
}
searchInput.addEventListener('input',render);
grid.addEventListener('keydown',e=>{
  const card=e.target.closest('.card');
  if(card&&(e.key==='Enter'||e.key===' ')){
    e.preventDefault();
    openItem(card.dataset.id);
  }
});
closeDialog.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open)dialog.close()});
init();

