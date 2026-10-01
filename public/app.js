const grid=document.querySelector('#grid');
const searchInput=document.querySelector('#searchInput');
const categoryChips=document.querySelector('#categoryChips');
const resultCount=document.querySelector('#resultCount');
const summaryLine=document.querySelector('#summaryLine');
const dialog=document.querySelector('#itemDialog');
const dialogContent=document.querySelector('#dialogContent');
const closeDialog=document.querySelector('#closeDialog');

let items=[];
let activeCategory='ALL';

const money=n=>Number(n).toFixed(2)+' z\u0142';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

const categoryAliases={
  Jackets:'jacket jackets coat coats kurtka kurtki outerwear',
  Shirts:'shirt shirts koszula koszule button up',
  Sweaters:'sweater sweaters jumper jumpers sweter swetry christmas',
  'T-Shirts':'tshirt t-shirt tee koszulka koszulki',
  Shoes:'shoe shoes sneaker sneakers trainers buty obuwie',
  Accessories:'accessory accessories cap hat czapka czapki'
};

async function init(){
  items=await fetch('/data/items.json').then(r=>r.json());
  items.forEach(i=>{
    i._search=norm([
      i.id,i.catalogNumber,i.name,i.size,i.color,i.category,
      i.condition,i.material,...(i.features||[]),categoryAliases[i.category]||''
    ].join(' '));
  });
  renderSummary();
  renderCategoryChips();
  render();
}

function renderSummary(){
  const available=items.filter(i=>i.status==='AVAILABLE').length;
  summaryLine.textContent=available+' available \u00b7 '+items.length+' total \u00b7 prices in PLN \u00b7 scroll or search by name / number';
}
function renderCategoryChips(){
  const cats=[...new Set(items.map(i=>i.category))].sort();
  const choices=[['ALL','All'],...cats.map(c=>[c,c])];
  categoryChips.innerHTML=choices.map(([value,label])=>
    '<button class="category-chip '+(activeCategory===value?'active':'')+'" data-category="'+esc(value)+'">'+esc(label)+'</button>'
  ).join('');
  categoryChips.querySelectorAll('.category-chip').forEach(btn=>{
    btn.addEventListener('click',()=>{
      activeCategory=btn.dataset.category;
      renderSummary();
  renderCategoryChips();
      render();
    });
  });
}

function matchesSearch(i,q){
  const nq=norm(q);
  if(!nq)return true;
  if(i._search.includes(nq))return true;
  const number=nq.replace(/^#/,'');
  if(/^\d+$/.test(number)) return i.id.endsWith(number)||i.catalogNumber.includes('#'+number);
  return nq.split(/\s+/).every(term=>i._search.includes(term));
}

function render(){
  const q=searchInput.value;
  const shown=items.filter(i=>(activeCategory==='ALL'||i.category===activeCategory)&&matchesSearch(i,q));
  resultCount.textContent=shown.length+' '+(shown.length===1?'item':'items');
  grid.innerHTML=shown.length?shown.map(card).join(''):'<div class="empty">No items match your search.</div>';
  grid.querySelectorAll('.card').forEach(el=>el.addEventListener('click',()=>openItem(el.dataset.id)));
}

function card(i){
  return '<article class="card" data-id="'+i.id+'">'+
    '<div class="photo"><img src="'+i.images[0]+'" alt="'+esc(i.name)+'" loading="lazy">'+
    '<span class="badge '+i.status.toLowerCase()+'">'+i.status+'</span></div>'+
    '<div class="card-body"><div class="meta">'+i.catalogNumber+' \u00b7 '+esc(i.category)+' \u00b7 SIZE '+esc(i.size)+'</div>'+
    '<h3>'+esc(i.name)+'</h3><div class="price-row"><span class="price">'+money(i.price)+'</span>'+
    (i.originalPrice?'<span class="old">'+money(i.originalPrice)+'</span>':'')+'</div></div></article>';
}

function openItem(iid){
  const i=items.find(x=>x.id===iid); if(!i)return;
  const facts=[
    ['Status',i.status],['Size',i.size],['Colour',i.color],
    ['Condition',i.condition],['Material',i.material]
  ].filter(x=>x[1]);
  const gallery=i.images.map((x,n)=>'<img src="'+x+'" alt="'+esc(i.name)+' photo '+(n+1)+'">').join('');
  const factHtml=facts.map(f=>'<div class="fact"><span>'+esc(f[0])+'</span><strong>'+esc(f[1])+'</strong></div>').join('');
  const featureHtml=i.features&&i.features.length?'<ul class="features">'+i.features.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
  dialogContent.innerHTML='<div class="detail"><div class="gallery">'+gallery+'</div><div class="info">'+
    '<div class="detail-id">'+i.catalogNumber+' \u00b7 '+esc(i.category)+'</div><h2>'+esc(i.name)+'</h2>'+
    '<div class="big-price">'+money(i.price)+(i.originalPrice?' <span class="old">'+money(i.originalPrice)+'</span>':'')+'</div>'+
    '<div class="fact-list">'+factHtml+'</div>'+featureHtml+
    '<button class="share" id="shareItem">Share / copy item</button></div></div>';
  dialog.showModal();
  document.querySelector('#shareItem').onclick=()=>shareItem(i);
}

async function shareItem(i){
  const text=i.catalogNumber+' \u2014 '+i.name+', size '+i.size+', '+money(i.price)+' \u00b7 Krakow';
  if(navigator.share){try{await navigator.share({title:i.name,text,url:location.href});return}catch(e){}}
  await navigator.clipboard.writeText(text+' '+location.href);
  const b=document.querySelector('#shareItem');
  b.textContent='Copied';
  setTimeout(()=>b.textContent='Share / copy item',1400);
}

searchInput.addEventListener('input',render);
closeDialog.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
init();
