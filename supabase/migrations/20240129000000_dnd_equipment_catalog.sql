-- ============================================================
-- Vorterium — catálogo de equipamentos D&D 5e 2014
-- Migration: 20240129000000_dnd_equipment_catalog.sql
-- Aplicar após: 20240128000000_dnd_rules_engine.sql
--
-- Os dados estruturados alimentam os seletores de armas, armaduras,
-- itens e ferramentas. Os detalhes da ficha continuam editáveis.
-- ============================================================

alter table public.dnd_character_attacks
  add column if not exists catalog_entry_key text;

alter table public.dnd_character_inventory
  add column if not exists catalog_entry_key text;

insert into public.dnd_rule_catalog_entries
  (ruleset, category, entry_key, name, description, metadata, sort_order)
values
  -- Armas simples corpo a corpo
  ('dnd5e_2014', 'weapon', 'club', 'Clava', 'Arma simples corpo a corpo.', '{"cost":"1 pp","damage":"1d4","damage_type":"concussão","weight":1,"properties":["leve"]}', 10),
  ('dnd5e_2014', 'weapon', 'dagger', 'Adaga', 'Arma simples corpo a corpo ou à distância.', '{"cost":"2 po","damage":"1d4","damage_type":"perfurante","weight":0.5,"properties":["acuidade","leve","arremesso 6/18"]}', 20),
  ('dnd5e_2014', 'weapon', 'greatclub', 'Porrete grande', 'Arma simples corpo a corpo.', '{"cost":"2 pp","damage":"1d8","damage_type":"concussão","weight":5,"properties":["duas mãos"]}', 30),
  ('dnd5e_2014', 'weapon', 'handaxe', 'Machado de mão', 'Arma simples corpo a corpo ou à distância.', '{"cost":"5 po","damage":"1d6","damage_type":"cortante","weight":1,"properties":["leve","arremesso 6/18"]}', 40),
  ('dnd5e_2014', 'weapon', 'javelin', 'Azagaia', 'Arma simples corpo a corpo ou à distância.', '{"cost":"5 pp","damage":"1d6","damage_type":"perfurante","weight":1,"properties":["arremesso 9/36"]}', 50),
  ('dnd5e_2014', 'weapon', 'light_hammer', 'Martelo leve', 'Arma simples corpo a corpo ou à distância.', '{"cost":"2 po","damage":"1d4","damage_type":"concussão","weight":1,"properties":["leve","arremesso 6/18"]}', 60),
  ('dnd5e_2014', 'weapon', 'mace', 'Maça', 'Arma simples corpo a corpo.', '{"cost":"5 po","damage":"1d6","damage_type":"concussão","weight":2,"properties":[]}', 70),
  ('dnd5e_2014', 'weapon', 'quarterstaff', 'Bordão', 'Arma simples corpo a corpo.', '{"cost":"2 pp","damage":"1d6","damage_type":"concussão","weight":2,"properties":["versátil 1d8"]}', 80),
  ('dnd5e_2014', 'weapon', 'sickle', 'Foice', 'Arma simples corpo a corpo.', '{"cost":"1 po","damage":"1d4","damage_type":"cortante","weight":1,"properties":["leve"]}', 90),
  ('dnd5e_2014', 'weapon', 'spear', 'Lança', 'Arma simples corpo a corpo ou à distância.', '{"cost":"1 po","damage":"1d6","damage_type":"perfurante","weight":1.5,"properties":["arremesso 6/18","versátil 1d8"]}', 100),
  ('dnd5e_2014', 'weapon', 'light_crossbow', 'Besta leve', 'Arma simples à distância.', '{"cost":"25 po","damage":"1d8","damage_type":"perfurante","weight":2.5,"properties":["munição 24/96","recarga","duas mãos"]}', 110),
  ('dnd5e_2014', 'weapon', 'dart', 'Dardo', 'Arma simples à distância.', '{"cost":"5 pc","damage":"1d4","damage_type":"perfurante","weight":0.1,"properties":["acuidade","arremesso 6/18"]}', 120),
  ('dnd5e_2014', 'weapon', 'shortbow', 'Arco curto', 'Arma simples à distância.', '{"cost":"25 po","damage":"1d6","damage_type":"perfurante","weight":1,"properties":["munição 24/96","duas mãos"]}', 130),
  ('dnd5e_2014', 'weapon', 'sling', 'Funda', 'Arma simples à distância.', '{"cost":"1 pp","damage":"1d4","damage_type":"concussão","weight":0.1,"properties":["munição 9/36"]}', 140),

  -- Armas marciais corpo a corpo
  ('dnd5e_2014', 'weapon', 'battleaxe', 'Machado de batalha', 'Arma marcial corpo a corpo.', '{"cost":"10 po","damage":"1d8","damage_type":"cortante","weight":2,"properties":["versátil 1d10"]}', 200),
  ('dnd5e_2014', 'weapon', 'flail', 'Mangual', 'Arma marcial corpo a corpo.', '{"cost":"10 po","damage":"1d8","damage_type":"concussão","weight":1,"properties":[]}', 210),
  ('dnd5e_2014', 'weapon', 'glaive', 'Glaive', 'Arma marcial corpo a corpo.', '{"cost":"20 po","damage":"1d10","damage_type":"cortante","weight":3,"properties":["pesada","alcance","duas mãos"]}', 220),
  ('dnd5e_2014', 'weapon', 'greataxe', 'Machado grande', 'Arma marcial corpo a corpo.', '{"cost":"30 po","damage":"1d12","damage_type":"cortante","weight":3.5,"properties":["pesada","duas mãos"]}', 230),
  ('dnd5e_2014', 'weapon', 'greatsword', 'Espada grande', 'Arma marcial corpo a corpo.', '{"cost":"50 po","damage":"2d6","damage_type":"cortante","weight":3,"properties":["pesada","duas mãos"]}', 240),
  ('dnd5e_2014', 'weapon', 'halberd', 'Alabarda', 'Arma marcial corpo a corpo.', '{"cost":"20 po","damage":"1d10","damage_type":"cortante","weight":3.5,"properties":["pesada","alcance","duas mãos"]}', 250),
  ('dnd5e_2014', 'weapon', 'lance', 'Lança de cavalaria', 'Arma marcial corpo a corpo.', '{"cost":"10 po","damage":"1d12","damage_type":"perfurante","weight":3,"properties":["alcance","especial"]}', 260),
  ('dnd5e_2014', 'weapon', 'longsword', 'Espada longa', 'Arma marcial corpo a corpo.', '{"cost":"15 po","damage":"1d8","damage_type":"cortante","weight":1.5,"properties":["versátil 1d10"]}', 270),
  ('dnd5e_2014', 'weapon', 'maul', 'Malho', 'Arma marcial corpo a corpo.', '{"cost":"10 po","damage":"2d6","damage_type":"concussão","weight":5,"properties":["pesada","duas mãos"]}', 280),
  ('dnd5e_2014', 'weapon', 'morningstar', 'Mangual de pontas', 'Arma marcial corpo a corpo.', '{"cost":"15 po","damage":"1d8","damage_type":"perfurante","weight":2,"properties":[]}', 290),
  ('dnd5e_2014', 'weapon', 'pike', 'Pique', 'Arma marcial corpo a corpo.', '{"cost":"5 po","damage":"1d10","damage_type":"perfurante","weight":9,"properties":["pesada","alcance","duas mãos"]}', 300),
  ('dnd5e_2014', 'weapon', 'rapier', 'Rapieira', 'Arma marcial corpo a corpo.', '{"cost":"25 po","damage":"1d8","damage_type":"perfurante","weight":1,"properties":["acuidade"]}', 310),
  ('dnd5e_2014', 'weapon', 'scimitar', 'Cimitarra', 'Arma marcial corpo a corpo.', '{"cost":"25 po","damage":"1d6","damage_type":"cortante","weight":1.5,"properties":["acuidade","leve"]}', 320),
  ('dnd5e_2014', 'weapon', 'shortsword', 'Espada curta', 'Arma marcial corpo a corpo.', '{"cost":"10 po","damage":"1d6","damage_type":"perfurante","weight":1,"properties":["acuidade","leve"]}', 330),
  ('dnd5e_2014', 'weapon', 'trident', 'Tridente', 'Arma marcial corpo a corpo ou à distância.', '{"cost":"5 po","damage":"1d6","damage_type":"perfurante","weight":2,"properties":["arremesso 6/18","versátil 1d8"]}', 340),
  ('dnd5e_2014', 'weapon', 'warhammer', 'Martelo de guerra', 'Arma marcial corpo a corpo.', '{"cost":"15 po","damage":"1d8","damage_type":"concussão","weight":1,"properties":["versátil 1d10"]}', 350),
  ('dnd5e_2014', 'weapon', 'war_pick', 'Picareta de guerra', 'Arma marcial corpo a corpo.', '{"cost":"5 po","damage":"1d8","damage_type":"perfurante","weight":1,"properties":[]}', 360),
  ('dnd5e_2014', 'weapon', 'whip', 'Chicote', 'Arma marcial corpo a corpo.', '{"cost":"2 po","damage":"1d4","damage_type":"cortante","weight":1.5,"properties":["acuidade","alcance"]}', 370),
  ('dnd5e_2014', 'weapon', 'hand_crossbow', 'Besta de mão', 'Arma marcial à distância.', '{"cost":"75 po","damage":"1d6","damage_type":"perfurante","weight":1.5,"properties":["munição 9/36","leve","recarga"]}', 400),
  ('dnd5e_2014', 'weapon', 'heavy_crossbow', 'Besta pesada', 'Arma marcial à distância.', '{"cost":"50 po","damage":"1d10","damage_type":"perfurante","weight":9,"properties":["munição 30/120","pesada","recarga","duas mãos"]}', 410),
  ('dnd5e_2014', 'weapon', 'longbow', 'Arco longo', 'Arma marcial à distância.', '{"cost":"50 po","damage":"1d8","damage_type":"perfurante","weight":2,"properties":["munição 45/180","pesada","duas mãos"]}', 420),
  ('dnd5e_2014', 'weapon', 'net', 'Rede', 'Arma marcial à distância.', '{"cost":"1 po","damage":"—","damage_type":"—","weight":1.5,"properties":["arremesso 5/15","especial"]}', 430),

  -- Armaduras e escudo
  ('dnd5e_2014', 'armor', 'padded', 'Acolchoada', 'Armadura leve.', '{"cost":"5 po","armor_class":11,"dexterity_cap":null,"weight":4,"stealth_disadvantage":true,"armor_group":"leve"}', 10),
  ('dnd5e_2014', 'armor', 'leather', 'Couro', 'Armadura leve.', '{"cost":"10 po","armor_class":11,"dexterity_cap":null,"weight":5,"stealth_disadvantage":false,"armor_group":"leve"}', 20),
  ('dnd5e_2014', 'armor', 'studded_leather', 'Couro batido', 'Armadura leve.', '{"cost":"45 po","armor_class":12,"dexterity_cap":null,"weight":6.5,"stealth_disadvantage":false,"armor_group":"leve"}', 30),
  ('dnd5e_2014', 'armor', 'hide', 'Gibão de peles', 'Armadura média.', '{"cost":"10 po","armor_class":12,"dexterity_cap":2,"weight":6,"stealth_disadvantage":false,"armor_group":"media"}', 40),
  ('dnd5e_2014', 'armor', 'chain_shirt', 'Camisa de malha', 'Armadura média.', '{"cost":"50 po","armor_class":13,"dexterity_cap":2,"weight":10,"stealth_disadvantage":false,"armor_group":"media"}', 50),
  ('dnd5e_2014', 'armor', 'scale_mail', 'Cota de escamas', 'Armadura média.', '{"cost":"50 po","armor_class":14,"dexterity_cap":2,"weight":22.5,"stealth_disadvantage":true,"armor_group":"media"}', 60),
  ('dnd5e_2014', 'armor', 'breastplate', 'Peitoral', 'Armadura média.', '{"cost":"400 po","armor_class":14,"dexterity_cap":2,"weight":10,"stealth_disadvantage":false,"armor_group":"media"}', 70),
  ('dnd5e_2014', 'armor', 'half_plate', 'Meia-armadura', 'Armadura média.', '{"cost":"750 po","armor_class":15,"dexterity_cap":2,"weight":20,"stealth_disadvantage":true,"armor_group":"media"}', 80),
  ('dnd5e_2014', 'armor', 'ring_mail', 'Cota de anéis', 'Armadura pesada.', '{"cost":"30 po","armor_class":14,"dexterity_cap":0,"weight":20,"stealth_disadvantage":true,"armor_group":"pesada"}', 90),
  ('dnd5e_2014', 'armor', 'chain_mail', 'Cota de malha', 'Armadura pesada.', '{"cost":"75 po","armor_class":16,"dexterity_cap":0,"weight":27.5,"strength_requirement":13,"stealth_disadvantage":true,"armor_group":"pesada"}', 100),
  ('dnd5e_2014', 'armor', 'splint', 'Cota de talas', 'Armadura pesada.', '{"cost":"200 po","armor_class":17,"dexterity_cap":0,"weight":30,"strength_requirement":15,"stealth_disadvantage":true,"armor_group":"pesada"}', 110),
  ('dnd5e_2014', 'armor', 'plate', 'Cota de placas', 'Armadura pesada.', '{"cost":"1500 po","armor_class":18,"dexterity_cap":0,"weight":32.5,"strength_requirement":15,"stealth_disadvantage":true,"armor_group":"pesada"}', 120),
  ('dnd5e_2014', 'armor', 'shield', 'Escudo', 'Equipamento defensivo.', '{"cost":"10 po","armor_bonus":2,"weight":3,"armor_group":"escudo"}', 130),

  -- Equipamentos de aventura mais usados
  ('dnd5e_2014', 'item', 'backpack', 'Mochila', 'Recipiente para carregar equipamentos.', '{"cost":"2 po","weight":2.5,"item_group":"recipiente"}', 10),
  ('dnd5e_2014', 'item', 'bedroll', 'Saco de dormir', 'Rolo de tecido para dormir ao ar livre.', '{"cost":"1 po","weight":3.5,"item_group":"acampamento"}', 20),
  ('dnd5e_2014', 'item', 'blanket', 'Cobertor', 'Cobertor simples para viagem.', '{"cost":"5 pp","weight":1.5,"item_group":"acampamento"}', 30),
  ('dnd5e_2014', 'item', 'caltrops', 'Bagalhas', 'Pequenos objetos pontiagudos para atrapalhar perseguições.', '{"cost":"1 po","weight":1,"item_group":"aventura"}', 40),
  ('dnd5e_2014', 'item', 'candle', 'Vela', 'Fonte pequena de luz.', '{"cost":"1 pc","weight":0,"item_group":"luz"}', 50),
  ('dnd5e_2014', 'item', 'crowbar', 'Pé de cabra', 'Ferramenta para alavancar objetos.', '{"cost":"2 po","weight":2.5,"item_group":"ferramenta"}', 60),
  ('dnd5e_2014', 'item', 'crowbar_iron', 'Pé de cabra de ferro', 'Ferramenta resistente para alavancar objetos.', '{"cost":"2 po","weight":2.5,"item_group":"ferramenta"}', 70),
  ('dnd5e_2014', 'item', 'grappling_hook', 'Gancho de escalada', 'Gancho preso a uma corda.', '{"cost":"2 po","weight":2,"item_group":"aventura"}', 80),
  ('dnd5e_2014', 'item', 'hammer', 'Martelo', 'Ferramenta de uso geral.', '{"cost":"1 po","weight":1.5,"item_group":"ferramenta"}', 90),
  ('dnd5e_2014', 'item', 'hempen_rope', 'Corda de cânhamo', 'Corda resistente para exploração.', '{"cost":"1 po","weight":5,"length":"15 m","item_group":"aventura"}', 100),
  ('dnd5e_2014', 'item', 'iron_spikes', 'Pitões de ferro', 'Pinos usados para fixar cordas e portas.', '{"cost":"1 po","weight":2.5,"quantity":10,"item_group":"aventura"}', 110),
  ('dnd5e_2014', 'item', 'lantern', 'Lanterna', 'Fonte de luz protegida contra vento.', '{"cost":"5 po","weight":1,"item_group":"luz"}', 120),
  ('dnd5e_2014', 'item', 'oil_flask', 'Frasco de óleo', 'Combustível para lanternas ou uso improvisado.', '{"cost":"1 pp","weight":0.5,"item_group":"luz"}', 130),
  ('dnd5e_2014', 'item', 'rations', 'Ração de viagem', 'Alimento seco para uma pessoa.', '{"cost":"5 pp","weight":1,"quantity_unit":"dia","item_group":"suprimento"}', 140),
  ('dnd5e_2014', 'item', 'tinderbox', 'Pederneira', 'Kit para acender fogo.', '{"cost":"5 pp","weight":0.5,"item_group":"aventura"}', 150),
  ('dnd5e_2014', 'item', 'torch', 'Tocha', 'Fonte de luz portátil.', '{"cost":"1 pc","weight":0.5,"item_group":"luz"}', 160),
  ('dnd5e_2014', 'item', 'waterskin', 'Cantil', 'Recipiente para água.', '{"cost":"2 pp","weight":2.5,"item_group":"suprimento"}', 170),
  ('dnd5e_2014', 'item', 'antitoxin', 'Antitoxina', 'Consumível usado contra venenos.', '{"cost":"50 po","weight":0,"item_group":"consumível"}', 180),
  ('dnd5e_2014', 'item', 'healers_kit', 'Kit de curandeiro', 'Suprimentos para estabilizar feridos.', '{"cost":"5 po","weight":1.5,"uses":10,"item_group":"curativo"}', 190),
  ('dnd5e_2014', 'item', 'holy_water', 'Água benta', 'Frasco preparado para uso contra criaturas profanas.', '{"cost":"25 po","weight":0.5,"item_group":"consumível"}', 200),
  ('dnd5e_2014', 'item', 'spellbook', 'Livro de magias', 'Livro usado por conjuradores para registrar magias.', '{"cost":"50 po","weight":1.5,"item_group":"foco"}', 210),
  ('dnd5e_2014', 'item', 'arcane_focus_crystal', 'Foco arcano: cristal', 'Foco arcano para conjuração.', '{"cost":"10 po","weight":0,"item_group":"foco"}', 220),
  ('dnd5e_2014', 'item', 'arcane_focus_orb', 'Foco arcano: orbe', 'Foco arcano para conjuração.', '{"cost":"20 po","weight":1.5,"item_group":"foco"}', 230),
  ('dnd5e_2014', 'item', 'arcane_focus_rod', 'Foco arcano: bastão', 'Foco arcano para conjuração.', '{"cost":"10 po","weight":1,"item_group":"foco"}', 240),
  ('dnd5e_2014', 'item', 'holy_symbol', 'Símbolo sagrado', 'Foco usado por conjuradores divinos.', '{"cost":"5 po","weight":0,"item_group":"foco"}', 250),
  ('dnd5e_2014', 'item', 'component_pouch', 'Bolsa de componentes', 'Bolsa para componentes materiais de magias.', '{"cost":"25 po","weight":1,"item_group":"foco"}', 260),

  -- Ferramentas
  ('dnd5e_2014', 'tool', 'thieves_tools', 'Ferramentas de ladrão', 'Ferramentas para abrir fechaduras e desarmar armadilhas.', '{"cost":"25 po","weight":0.5,"tool_group":"especial"}', 10),
  ('dnd5e_2014', 'tool', 'herbalism_kit', 'Kit de herbalismo', 'Ferramentas para identificar e preparar plantas.', '{"cost":"5 po","weight":1.5,"tool_group":"artesão"}', 20),
  ('dnd5e_2014', 'tool', 'disguise_kit', 'Kit de disfarce', 'Cosméticos e acessórios para criar disfarces.', '{"cost":"25 po","weight":1.5,"tool_group":"especial"}', 30),
  ('dnd5e_2014', 'tool', 'forgery_kit', 'Kit de falsificação', 'Materiais para criar documentos falsos.', '{"cost":"15 po","weight":2.5,"tool_group":"especial"}', 40),
  ('dnd5e_2014', 'tool', 'navigator_tools', 'Ferramentas de navegador', 'Instrumentos de navegação e cartografia.', '{"cost":"25 po","weight":1,"tool_group":"especial"}', 50),
  ('dnd5e_2014', 'tool', 'smith_tools', 'Ferramentas de ferreiro', 'Ferramentas de trabalho em metal.', '{"cost":"20 po","weight":4,"tool_group":"artesão"}', 60),
  ('dnd5e_2014', 'tool', 'musical_instrument_lute', 'Instrumento musical: alaúde', 'Instrumento musical portátil.', '{"cost":"35 po","weight":1,"tool_group":"instrumento"}', 70),
  ('dnd5e_2014', 'tool', 'musical_instrument_flute', 'Instrumento musical: flauta', 'Instrumento musical portátil.', '{"cost":"2 po","weight":0.5,"tool_group":"instrumento"}', 80)
on conflict (ruleset, category, entry_key) do update set
  name = excluded.name,
  description = excluded.description,
  metadata = excluded.metadata,
  sort_order = excluded.sort_order,
  is_active = true;
