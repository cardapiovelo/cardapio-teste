import { h } from '../../core/dom.js';
import { formatBRL } from '../../core/utils.js';
import { pageHeader, panel } from '../ui/form.js';
import { loadAnalytics } from '../orders-api.js';

export const id='analytics';
export const label='Analytics';
export const iconName='home';

export function render(container,ctx) {
  const body=h('div',{class:'stack'},h('p',{class:'muted'},'Carregando dados...'));
  container.replaceChildren(pageHeader('Analytics','Visão de vendas e desempenho dos pedidos.'),body);
  loadAnalytics(ctx.slug,30).then(({analytics:a})=>{
    body.replaceChildren(
      h('div',{class:'stats'},
        h('div',{class:'stat'},h('strong',{},formatBRL(a.revenue)),h('span',{},'Faturamento')),
        h('div',{class:'stat'},h('strong',{},String(a.completed)),h('span',{},'Concluídos')),
        h('div',{class:'stat'},h('strong',{},formatBRL(a.averageTicket)),h('span',{},'Ticket médio')),
        h('div',{class:'stat'},h('strong',{},String(a.pending)),h('span',{},'Em andamento'))
      ),
      panel('Status dos pedidos',h('ul',{class:'checklist'},Object.entries(a.byStatus).map(([k,v])=>h('li',{},h('span',{},k.replaceAll('_',' ')),h('strong',{},String(v)))))),
      panel('Mais vendidos',h('ol',{class:'checklist'},a.topProducts.map(p=>h('li',{},h('span',{},p.name),h('strong',{},p.quantity+' un. · '+formatBRL(p.revenue)))))),
      panel('Faturamento por dia',h('div',{class:'stack'},a.byDay.map(([day,total])=>h('div',{class:'meter-row'},h('span',{},day),h('strong',{},formatBRL(total)))))
    );
  }).catch(error=>body.replaceChildren(h('p',{class:'notice notice--warn'},error.message)));
}
