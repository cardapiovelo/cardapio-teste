/** Cardápio de exemplo (loja fictícia) usado no modo demo. */
import { defaultHours, normalizeStore } from './schema.js';

/**
 * Cardápio de exemplo para quem acabou de criar a loja:
 * mantém produtos, categorias e cupons, mas limpa os dados da loja fictícia.
 */
export function createStarterStore({ slug, name }) {
  const demo = createDemoStore(slug);
  return normalizeStore({
    ...demo,
    profile: { name, tagline: '', about: '', whatsapp: '', instagram: '', address: {} },
    payments: demo.payments.map((payment) => (payment.type === 'pix' ? { ...payment, pixKey: '' } : payment)),
  });
}

const option = (name, price = 0) => ({ name, price });

const group = (name, options, extra = {}) => ({
  name,
  type: 'single',
  required: false,
  options,
  ...extra,
});

const pick = (names) => names.map((name) => option(name));

export function createDemoStore(slug = 'demo') {
  const hours = defaultHours().map((entry) => ({
    ...entry,
    from: '13:00',
    to: entry.day === 0 ? '22:00' : '22:30',
  }));

  return normalizeStore({
    slug,
    profile: {
      name: 'Açaí da Casa',
      tagline: 'Açaí, milk shake e sorvete artesanal',
      about:
        'Cardápio de demonstração. Aqui você vê como o seu cardápio ficará para os clientes. ' +
        'Entre no painel para trocar nome, fotos, preços, horários e tudo mais.',
      whatsapp: '5511900000000',
      instagram: 'acaidacasa',
      address: { street: 'Av. Principal', number: '100', district: 'Centro', city: 'Sua Cidade', state: 'SP' },
    },
    settings: {
      deliveryFee: 5,
      freeDeliveryAbove: 60,
      minOrder: 15,
      deliveryTimeMin: 60,
      pickupTimeMin: 20,
    },
    hours,
    payments: [
      { id: 'cash', type: 'cash', label: 'Dinheiro', enabled: true, askChange: true },
      { id: 'credit', type: 'card', label: 'Cartão de crédito', enabled: true, note: 'Levamos a máquina até você.' },
      { id: 'debit', type: 'card', label: 'Cartão de débito', enabled: true, note: 'Levamos a máquina até você.' },
      { id: 'pix', type: 'pix', label: 'Pix', enabled: true, pixKey: 'pix@acaidacasa.com.br' },
    ],
    categories: [
      { id: 'cat-acai', name: 'Açaí' },
      { id: 'cat-milk', name: 'Milk shake' },
      { id: 'cat-sorvete', name: 'Sorvetes' },
      { id: 'cat-picole', name: 'Picolés' },
      { id: 'cat-pote', name: 'Potes' },
      { id: 'cat-bebidas', name: 'Bebidas' },
    ],
    products: [
      {
        id: 'prod-monte-acai',
        categoryId: 'cat-acai',
        name: 'Monte seu açaí',
        description: 'Escolha o tamanho, as frutas e os complementos do seu jeito.',
        price: 0,
        featured: true,
        optionGroups: [
          group('Tamanho', [option('330 ml', 17), option('550 ml', 24), option('770 ml', 31)], { required: true }),
          group('Frutas', pick(['Banana', 'Morango', 'Manga', 'Uva', 'Kiwi']), { type: 'multiple', max: 2 }),
          group(
            'Complementos grátis',
            pick(['Granola', 'Leite em pó', 'Confete', 'Mini ball', 'Paçoca', 'Amendoim', 'Granulado colorido', 'Sucrilhos']),
            { type: 'multiple', max: 4 },
          ),
          group('Cobertura', pick(['Chocolate', 'Morango', 'Caramelo', 'Leite condensado', 'Doce de leite'])),
          group(
            'Adicionais',
            [option('Nutella', 4), option('Creme de ninho', 3.5), option('Ovomaltine', 3), option('Kit Kat', 4), option('Oreo', 3), option('Bis', 3)],
            { type: 'multiple', max: 5 },
          ),
        ],
      },
      {
        id: 'prod-acai-puro',
        categoryId: 'cat-acai',
        name: 'Açaí puro',
        description: 'Açaí tradicional batido, sem complementos.',
        price: 14,
        promoPrice: 12,
      },
      {
        id: 'prod-milk-shake',
        categoryId: 'cat-milk',
        name: 'Copo milk shake',
        description: 'Cremoso, batido na hora.',
        price: 0,
        featured: true,
        optionGroups: [
          group('Tamanho', [option('330 ml', 11), option('550 ml', 16)], { required: true }),
          group(
            'Sabor',
            [option('Chocolate'), option('Morango'), option('Leite Ninho'), option('Doce de leite'), option('Ovomaltine'), option('Napolitano'), option('Nutella', 3)],
            { required: true },
          ),
        ],
      },
      {
        id: 'prod-copao',
        categoryId: 'cat-sorvete',
        name: 'Copão de sorvete expresso',
        description: 'Sorvete com cobertura à sua escolha.',
        price: 12,
        promoPrice: 10,
        optionGroups: [
          group('Tamanho', [option('300 ml'), option('500 ml', 4), option('700 ml', 7)], { required: true }),
          group('Sabores', pick(['Chocolate', 'Ninho', 'Misto']), { type: 'multiple', required: true, min: 1, max: 2 }),
          group('Cobertura', pick(['Chocolate', 'Morango', 'Caramelo'])),
        ],
      },
      {
        id: 'prod-sundae',
        categoryId: 'cat-sorvete',
        name: 'Sundae',
        description: 'Uma cobertura e dois complementos.',
        price: 12,
        optionGroups: [
          group('Cobertura', pick(['Chocolate', 'Morango', 'Caramelo', 'Leite condensado']), { required: true }),
          group('Complementos', pick(['Confete', 'Mini ball', 'Granulado', 'Paçoca', 'Amendoim']), { type: 'multiple', max: 2 }),
        ],
      },
      {
        id: 'prod-cone',
        categoryId: 'cat-sorvete',
        name: 'Cone crocante',
        description: 'Cone de sorvete crocante.',
        price: 10.99,
      },
      {
        id: 'prod-picole',
        categoryId: 'cat-picole',
        name: 'Picolé',
        description: 'Escolha o sabor. Os recheados custam um pouco mais.',
        price: 2,
        optionGroups: [
          group(
            'Sabor',
            [option('Morango'), option('Limão'), option('Maracujá'), option('Uva'), option('Coco'), option('Chocolate recheado', 2), option('Brigadeiro recheado', 2), option('Leite Ninho recheado', 2)],
            { required: true },
          ),
        ],
      },
      {
        id: 'prod-pote-2l',
        categoryId: 'cat-pote',
        name: 'Pote de sorvete 2 litros',
        description: 'Para dividir com a família.',
        price: 31,
        optionGroups: [
          group('Sabor', pick(['Napolitano', 'Brigadeiro', 'Flocos', 'Morango com leite condensado', 'Creme', 'Milho verde']), { required: true }),
        ],
      },
      {
        id: 'prod-pote-trufado',
        categoryId: 'cat-pote',
        name: 'Pote trufado 1,8 L',
        description: 'Sorvete recheado com trufa.',
        price: 34,
        optionGroups: [group('Sabor', pick(['Dois amores', 'Trufadinho', 'Torta de limão', 'Maracujá trufado']), { required: true })],
      },
      {
        id: 'prod-refri',
        categoryId: 'cat-bebidas',
        name: 'Refrigerante',
        description: 'Gelado.',
        price: 0,
        optionGroups: [
          group('Tamanho', [option('Lata 350 ml', 6), option('600 ml', 8), option('2 litros', 13)], { required: true }),
        ],
      },
      {
        id: 'prod-agua',
        categoryId: 'cat-bebidas',
        name: 'Água mineral 500 ml',
        description: 'Com ou sem gás.',
        price: 3,
      },
    ],
    coupons: [
      { code: 'BEMVINDO10', type: 'percent', value: 10, minOrder: 20 },
      { code: 'ACAI5', type: 'fixed', value: 5, minOrder: 30 },
    ],
  });
}
