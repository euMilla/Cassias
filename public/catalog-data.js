window.CASSIAS_CATALOG = {
  categories: [
    { id: "todos", label: "Todos" },
    { id: "salgados", label: "Salgados" },
    { id: "bolos", label: "Bolos" },
    { id: "doces", label: "Docinhos" },
    { id: "kits", label: "Kits festa" }
  ],
  deliveryZones: [
    { id: "gonzaga", name: "Gonzaga", fee: 8, eta: "30 a 45 min" },
    { id: "boqueirao", name: "Boqueirao", fee: 8, eta: "30 a 45 min" },
    { id: "embare", name: "Embare", fee: 9, eta: "35 a 50 min" },
    { id: "ponta-praia", name: "Ponta da Praia", fee: 10, eta: "40 a 55 min" },
    { id: "aparecida", name: "Aparecida", fee: 9, eta: "35 a 50 min" },
    { id: "jose-menino", name: "Jose Menino", fee: 10, eta: "40 a 55 min" },
    { id: "marape", name: "Marape", fee: 11, eta: "45 a 60 min" },
    { id: "campo-grande", name: "Campo Grande", fee: 10, eta: "40 a 55 min" },
    { id: "vila-belmiro", name: "Vila Belmiro", fee: 12, eta: "45 a 60 min" },
    { id: "centro", name: "Centro", fee: 13, eta: "50 a 65 min" },
    { id: "macuco", name: "Macuco", fee: 12, eta: "45 a 60 min" },
    { id: "areia-branca", name: "Areia Branca", fee: 14, eta: "55 a 70 min" },
    { id: "radio-clube", name: "Radio Clube", fee: 16, eta: "60 a 75 min" }
  ],
  products: [
    {
      id: "coxinha",
      name: "Coxinhas artesanais",
      category: "salgados",
      tag: "Mais pedida",
      description: "Coxinhas sequinhas por fora e cremosas por dentro, feitas para festas, encomendas e cafe da tarde.",
      image: "assets/coxinhas.jpg",
      flavors: ["Frango cremoso", "Frango com catupiry", "Carne", "Queijo", "Calabresa", "Palmito"],
      sizes: [
        { id: "pequeno", label: "Pequeno - 50 un.", price: 45 },
        { id: "media", label: "Media - 30 un.", price: 54 },
        { id: "grande", label: "Grande - 10 un.", price: 62 }
      ]
    },
    {
      id: "salgados-sortidos",
      name: "Salgados sortidos",
      category: "salgados",
      tag: "Combo",
      description: "Salgados fritos e assados para festa, com coxinha, kibe, risole, bolinha de queijo, empadinha e esfiha.",
      image: "assets/salgados.jpg",
      flavors: ["Tradicional misto", "Frango e queijo", "Carne e calabresa", "Vegetariano"],
      sizes: [
        { id: "pequeno", label: "Pequeno - 50 un.", price: 58 },
        { id: "media", label: "Media - 100 un.", price: 108 },
        { id: "grande", label: "Grande - 150 un.", price: 156 }
      ]
    },
    {
      id: "empada-aberta",
      name: "Empadinhas e esfihas",
      category: "salgados",
      tag: "Assados",
      description: "Assados dourados para mesa de aniversario, reuniao e eventos pequenos.",
      image: "assets/salgados.jpg",
      flavors: ["Carne temperada", "Frango", "Queijo", "Palmito", "Pizza"],
      sizes: [
        { id: "pequeno", label: "Pequeno - 25 un.", price: 72 },
        { id: "media", label: "Media - 50 un.", price: 135 },
        { id: "grande", label: "Grande - 100 un.", price: 255 }
      ]
    },
    {
      id: "bolo-decorado",
      name: "Bolo decorado",
      category: "bolos",
      tag: "Sob encomenda",
      description: "Bolos recheados com acabamento delicado em chantininho, brigadeiro ou frutas.",
      image: "assets/bolos.jpg",
      flavors: ["Chocolate com brigadeiro", "Ninho com morango", "Prestigio", "Doce de leite com ameixa", "Morango com creme"],
      sizes: [
        { id: "15cm", label: "15 cm - ate 12 fatias", price: 95 },
        { id: "20cm", label: "20 cm - ate 22 fatias", price: 145 },
        { id: "25cm", label: "25 cm - ate 35 fatias", price: 220 },
        { id: "30cm", label: "30 cm - ate 50 fatias", price: 320 }
      ]
    },
    {
      id: "bolo-caseiro",
      name: "Bolo caseiro",
      category: "bolos",
      tag: "Cafe",
      description: "Bolos fofinhos para cafe, com cobertura simples ou calda especial.",
      image: "assets/bolos.jpg",
      flavors: ["Cenoura com chocolate", "Fuba cremoso", "Laranja", "Chocolate", "Milho"],
      sizes: [
        { id: "pequeno", label: "Pequeno - 18 cm", price: 45 },
        { id: "medio", label: "Medio - 22 cm", price: 68 },
        { id: "grande", label: "Grande - 26 cm", price: 92 }
      ]
    },
    {
      id: "docinhos-festa",
      name: "Docinhos de festa",
      category: "doces",
      tag: "Coloridos",
      description: "Docinhos enrolados em forminhas, com acabamento caprichado em cores de festa.",
      image: "assets/docinhos.jpg",
      flavors: ["Brigadeiro", "Beijinho", "Bicho de pe", "Cajuzinho", "Ninho"],
      sizes: [
        { id: "pequeno", label: "Pequeno - 50 un.", price: 60 },
        { id: "media", label: "Media - 100 un.", price: 110 },
        { id: "grande", label: "Grande - 200 un.", price: 205 }
      ]
    },
    {
      id: "brigadeiro-gourmet",
      name: "Brigadeiro gourmet",
      category: "doces",
      tag: "Gourmet",
      description: "Brigadeiros especiais com chocolate, granulados premium e sabores de vitrine.",
      image: "assets/docinhos.jpg",
      flavors: ["Chocolate belga", "Ninho com Nutella", "Pistache", "Churros", "Cafe"],
      sizes: [
        { id: "20un", label: "Caixa - 20 un.", price: 72 },
        { id: "50un", label: "Caixa - 50 un.", price: 165 },
        { id: "100un", label: "Caixa - 100 un.", price: 310 }
      ]
    },
    {
      id: "kit-festa",
      name: "Kit festa completo",
      category: "kits",
      tag: "Completo",
      description: "Kit com bolo, salgados e docinhos para comemorar sem montar tudo separado.",
      image: "assets/bolos.jpg",
      flavors: ["Classico aniversario", "Chocolate e morango", "Ninho e frango", "Salgado reforcado"],
      sizes: [
        { id: "pequeno", label: "Pequeno - 20 pessoas", price: 189 },
        { id: "medio", label: "Medio - 40 pessoas", price: 329 },
        { id: "grande", label: "Grande - 70 pessoas", price: 549 }
      ]
    }
  ]
};
