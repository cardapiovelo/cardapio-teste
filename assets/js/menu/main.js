import { $ } from '../core/dom.js';
import { debounce, safeUrl } from '../core/utils.js';
import { resolveSlug } from '../core/slug.js';
import { applyTheme } from '../core/theme.js';
import { h, render } from '../core/dom.js';
import { getDriver } from '../storage/index.js';
import { applyStoreManifest } from '../pwa/manifest.js';
import { initInstallPrompt } from '../pwa/install-prompt.js';
import { registerServiceWorker } from '../pwa/register-sw.js';
import { emptyState } from '../ui/empty-state.js';
import { toast } from '../ui/toast.js';
import { createCart } from './cart.js';
import { installOrderSync } from './order-sync.js';
import { renderBottomNav } from './components/bottom-nav.js';
import { observeSections, renderCategoryNav } from './components/category-nav.js';
import { openCartSheet } from './components/cart-sheet.js';
import { openCheckoutSheet } from './components/checkout-sheet.js';
import { openHistorySheet } from './components/history-sheet.js';
import { openAboutSheet, openHoursSheet, openMoreInfoSheet } from './components/info-sheets.js';
import { renderHeader } from './components/header.js';
import { openProductSheet } from './components/product-modal.js';
import { renderProductList } from './components/product-list.js';
import { openSuccessSheet } from './components/success-sheet.js';
import { buildSections } from './sections.js';

function showMessage({iconName='bowl',title,text,action}) {
  $('#splash')?.remove(); document.body.classList.add('is-ready');
  render($('#app'),emptyState({iconName,title,text,action})); $('#app').classList.add('is-message');
}
async function main() {
  installOrderSync();
  const slug=resolveSlug(),driver=await getDriver(); let store;
  try { store=await driver.load(slug); }
  catch(error) { return showMessage({iconName:'info',title:'Não foi possível abrir o cardápio',text:error.message,action:h('button',{type:'button',class:'btn btn--primary',onClick:()=>location.reload()},'Tentar de novo')}); }
  if(!store&&!new URLSearchParams(location.search).get('loja')&&driver.name==='firebase')
    return showMessage({title:'Abra o link da sua loja',text:'Este endereço não indica qual cardápio abrir. Use o link completo da loja, que termina com ?loja=endereco-da-loja.',action:h('a',{class:'btn btn--primary',href:'admin/index.html'},'Entrar no painel')});
  if(!store) return showMessage({title:'Cardápio não encontrado',text:'Não existe uma loja com o endereço "'+slug+'". Confira o link ou crie a sua loja no painel.',action:driver.name==='firebase'?null:h('a',{class:'btn btn--primary',href:'admin/'},'Abrir o painel')});
  applyTheme(store.theme); document.title=store.profile.name+' | Cardápio';
  document.querySelector('meta[name="description"]')?.setAttribute('content',store.profile.tagline||'Peça em '+store.profile.name);
  applyStoreManifest(store,slug);
  const cart=createCart(slug),removed=cart.reconcile(store);
  const header=renderHeader($('#store-header'),store,{onAbout:()=>openAboutSheet(store),onHours:()=>openHoursSheet(store),onMoreInfo:()=>openMoreInfoSheet(store)});
  setInterval(header.refreshStatus,60000);
  const menuEl=$('#menu'),navEl=$('#category-nav');let stopObserving=()=>{},nav;
  const scrollToSection=id=>document.getElementById('section-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});
  const openProduct=product=>openProductSheet({product,onAdd:item=>{cart.add(item);toast(item.name+' no carrinho',{type:'success'});}});
  function renderMenu(query='') {
    const sections=buildSections(store,query);stopObserving();nav=renderCategoryNav(navEl,sections,{onSelect:scrollToSection});
    renderProductList(menuEl,sections,{onOpen:openProduct,query});stopObserving=observeSections(menuEl,id=>nav.setActive(id));if(sections[0])nav.setActive(sections[0].id);
  }
  renderMenu();$('#search').addEventListener('input',debounce(event=>renderMenu(event.target.value.trim()),180));
  const openCheckout=()=>openCheckoutSheet({store,slug,cart,onSent:(order,url)=>{window.open(url,'_blank','noopener');openSuccessSheet({order,url});}});
  const openCart=()=>openCartSheet({cart,store,onCheckout:openCheckout});
  const bottomNav=renderBottomNav($('#bottom-nav'),{onMenu:()=>window.scrollTo({top:0,behavior:'smooth'}),onCart:openCart,onHistory:()=>openHistorySheet({store,slug,cart,onRepeat:openCart})});
  const syncCart=()=>bottomNav.setCart({count:cart.count(),subtotal:cart.subtotal()});cart.subscribe(syncCart);syncCart();
  registerServiceWorker('sw.js');initInstallPrompt({storeName:store.profile.name,logo:safeUrl(store.profile.logo)});
  $('#splash')?.remove();document.body.classList.add('is-ready');if(removed>0)toast('Atualizamos seu carrinho com o cardápio de hoje.');
}
main().catch(error=>{console.error(error);showMessage({iconName:'info',title:'Algo deu errado',text:'Recarregue a página para tentar de novo.'});});
