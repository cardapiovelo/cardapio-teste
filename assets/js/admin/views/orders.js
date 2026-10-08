import { h } from '../../core/dom.js';
import { formatBRL } from '../../core/utils.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { pageHeader, panel } from '../ui/form.js';
import { listOrders, setOrderStatus } from '../orders-api.js';

export const id='pedidos';
export const label='Pedidos';
export const iconName='list';

const labels={new:'Novo',confirmed:'Confirmado',preparing:'Preparando',out_for_delivery:'Saiu para entrega',completed:'Concluído',cancelled:'Cancelado'};
const next={new:'confirmed',confirmed:'preparing',preparing:'out_for_delivery',out_for_delivery:'completed'};

const money=n=>formatBRL(Number(n||0));
function orderCard(order,ctx,onChange) {
  const items=order.items.map(i=>i.quantity+'x '+i.name).join(', ');
  const actions=Object.entries(labels).filter(([status])=>status!==order.status).slice(0,3);
  return h('article',{class:'panel order-card'},
    h('div',{class:'order-card__top'},h('strong',{},'#'+order.code),h('span',{class:'muted'},new Date(order.createdAt).toLocaleString('pt-BR'))),
    h('p',{},h('strong',{},order.customer.name),' · ',order.customer.phone),
    h('p',{class:'muted'},items),
    h('p',{},h('strong',{},money(order.totals.total)),' · ',order.payment.label,' · ',labels[order.status]),
    order.address?.street&&h('p',{class:'muted'},order.address.street+', '+order.address.number+' · '+order.address.district),
    order.note&&h('p',{class:'notice'},'Obs.: '+order.note),
    h('div',{class:'actions'},
      next[order.status]&&h('button',{class:'btn btn--primary btn--small',onClick:()=>onChange(order,next[order.status])},'Avançar: '+labels[next[order.status]]),
      order.status!=='completed'&&order.status!=='cancelled'&&h('button',{class:'btn btn--soft btn--small',onClick:()=>onChange(order,'cancelled')},'Cancelar'),
    )
  );
}

export function render(container,ctx) {
  let stopped=false,orders=[];
  const list=h('div',{class:'stack'});
  const status=h('p',{class:'muted'},'Carregando pedidos...');
  async function refresh() {
    try {
      const data=await listOrders(ctx.slug); if(stopped)return; orders=data.orders;
      status.textContent=orders.length+' pedidos recentes · atualização automática a cada 5s';
      list.replaceChildren(...orders.map(o=>orderCard(o,ctx,change)));
    } catch(error) { status.textContent=error.message; }
  }
  async function change(order,newStatus) {
    try { await setOrderStatus(ctx.slug,order.id,newStatus);toast('Pedido '+labels[newStatus].toLowerCase()+'.',{type:'success'});await refresh(); }
    catch(error){toast(error.message,{type:'error'});}
  }
  container.replaceChildren(pageHeader('Pedidos','Acompanhe os pedidos recebidos e atualize o status em tempo real.'),panel('Fila de pedidos',status,list));
  refresh(); const timer=setInterval(refresh,5000);
  ctx._ordersCleanup=()=>{stopped=true;clearInterval(timer);};
}
