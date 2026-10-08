let installed=false;

export function installOrderSync() {
  if(installed) return;
  installed=true;
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value) {
    const result=original.call(this,key,value);
    if(key.includes(':orders:')) {
      try {
        const orders=JSON.parse(value);
        const order=Array.isArray(orders)?orders[0]:null;
        const match=key.match(/:orders:([^:]+)$/);
        if(order&&match) fetch('/api/stores/'+encodeURIComponent(match[1])+'/orders',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(order)
        }).catch(()=>{});
      } catch {}
    }
    return result;
  };
}
