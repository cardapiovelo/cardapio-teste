import { CONFIG } from '../config.js';

const tokenKey=slug=>CONFIG.storageNamespace+':token:'+slug;
function token(slug) {
  try { const x=JSON.parse(localStorage.getItem(tokenKey(slug))||'null'); return x?.expiresAt>Date.now()?x.token:null; }
  catch { return null; }
}
async function request(slug,path,options={}) {
  const init={...options,headers:{...(options.headers||{}),Authorization:'Bearer '+token(slug)}};
  if(options.body){init.headers['Content-Type']='application/json';init.body=JSON.stringify(options.body);}
  const res=await fetch(CONFIG.apiBase+path,init);const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Não foi possível consultar os pedidos.');
  return data;
}
export const listOrders=(slug)=>request(slug,'/stores/'+slug+'/orders?limit=100');
export const setOrderStatus=(slug,id,status)=>request(slug,'/stores/'+slug+'/orders/'+encodeURIComponent(id),{method:'PATCH',body:{status}});
export const loadAnalytics=(slug,days=30)=>request(slug,'/stores/'+slug+'/analytics?days='+days);
