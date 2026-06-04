CREATE DATABASE IF NOT EXISTS cassias_doces
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cassias_doces;

CREATE TABLE IF NOT EXISTS delivery_zones (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  eta VARCHAR(40) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(40) NOT NULL,
  description TEXT NOT NULL,
  image VARCHAR(180) NOT NULL,
  flavors_json JSON NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS product_sizes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(60) NOT NULL,
  size_id VARCHAR(40) NOT NULL,
  label VARCHAR(120) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  UNIQUE KEY unique_product_size (product_id, size_id),
  CONSTRAINT fk_product_sizes_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  delivery_zone_id VARCHAR(40) NOT NULL,
  delivery_zone_name VARCHAR(80) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  street VARCHAR(160) NOT NULL,
  address_number VARCHAR(30) NOT NULL,
  complement VARCHAR(120) NULL,
  delivery_date DATE NULL,
  delivery_time TIME NULL,
  payment_method VARCHAR(40) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  notes TEXT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('novo', 'confirmado', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado') NOT NULL DEFAULT 'novo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id VARCHAR(60) NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  category VARCHAR(40) NOT NULL,
  size_id VARCHAR(40) NOT NULL,
  size_label VARCHAR(120) NOT NULL,
  flavor VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
);

INSERT INTO delivery_zones (id, name, fee, eta, active) VALUES
  ('gonzaga', 'Gonzaga', 8.00, '30 a 45 min', 1),
  ('boqueirao', 'Boqueirao', 8.00, '30 a 45 min', 1),
  ('embare', 'Embare', 9.00, '35 a 50 min', 1),
  ('ponta-praia', 'Ponta da Praia', 10.00, '40 a 55 min', 1),
  ('aparecida', 'Aparecida', 9.00, '35 a 50 min', 1),
  ('jose-menino', 'Jose Menino', 10.00, '40 a 55 min', 1),
  ('marape', 'Marape', 11.00, '45 a 60 min', 1),
  ('campo-grande', 'Campo Grande', 10.00, '40 a 55 min', 1),
  ('vila-belmiro', 'Vila Belmiro', 12.00, '45 a 60 min', 1),
  ('centro', 'Centro', 13.00, '50 a 65 min', 1),
  ('macuco', 'Macuco', 12.00, '45 a 60 min', 1),
  ('areia-branca', 'Areia Branca', 14.00, '55 a 70 min', 1),
  ('radio-clube', 'Radio Clube', 16.00, '60 a 75 min', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  fee = VALUES(fee),
  eta = VALUES(eta),
  active = VALUES(active);

INSERT INTO products (id, name, category, description, image, flavors_json, active) VALUES
  ('coxinha', 'Coxinhas artesanais', 'salgados', 'Coxinhas sequinhas por fora e cremosas por dentro, feitas para festas, encomendas e cafe da tarde.', 'assets/coxinhas.jpg', JSON_ARRAY('Frango cremoso', 'Frango com catupiry', 'Carne', 'Queijo', 'Calabresa', 'Palmito'), 1),
  ('salgados-sortidos', 'Salgados sortidos', 'salgados', 'Salgados fritos e assados para festa, com coxinha, kibe, risole, bolinha de queijo, empadinha e esfiha.', 'assets/salgados.jpg', JSON_ARRAY('Tradicional misto', 'Frango e queijo', 'Carne e calabresa', 'Vegetariano'), 1),
  ('empada-aberta', 'Empadinhas e esfihas', 'salgados', 'Assados dourados para mesa de aniversario, reuniao e eventos pequenos.', 'assets/salgados.jpg', JSON_ARRAY('Carne temperada', 'Frango', 'Queijo', 'Palmito', 'Pizza'), 1),
  ('bolo-decorado', 'Bolo decorado', 'bolos', 'Bolos recheados com acabamento delicado em chantininho, brigadeiro ou frutas.', 'assets/bolos.jpg', JSON_ARRAY('Chocolate com brigadeiro', 'Ninho com morango', 'Prestigio', 'Doce de leite com ameixa', 'Morango com creme'), 1),
  ('bolo-caseiro', 'Bolo caseiro', 'bolos', 'Bolos fofinhos para cafe, com cobertura simples ou calda especial.', 'assets/bolos.jpg', JSON_ARRAY('Cenoura com chocolate', 'Fuba cremoso', 'Laranja', 'Chocolate', 'Milho'), 1),
  ('docinhos-festa', 'Docinhos de festa', 'doces', 'Docinhos enrolados em forminhas, com acabamento caprichado em cores de festa.', 'assets/docinhos.jpg', JSON_ARRAY('Brigadeiro', 'Beijinho', 'Bicho de pe', 'Cajuzinho', 'Ninho'), 1),
  ('brigadeiro-gourmet', 'Brigadeiro gourmet', 'doces', 'Brigadeiros especiais com chocolate, granulados premium e sabores de vitrine.', 'assets/docinhos.jpg', JSON_ARRAY('Chocolate belga', 'Ninho com Nutella', 'Pistache', 'Churros', 'Cafe'), 1),
  ('kit-festa', 'Kit festa completo', 'kits', 'Kit com bolo, salgados e docinhos para comemorar sem montar tudo separado.', 'assets/bolos.jpg', JSON_ARRAY('Classico aniversario', 'Chocolate e morango', 'Ninho e frango', 'Salgado reforcado'), 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  category = VALUES(category),
  description = VALUES(description),
  image = VALUES(image),
  flavors_json = VALUES(flavors_json),
  active = VALUES(active);

DELETE FROM product_sizes
WHERE size_id = 'mini'
  AND product_id IN ('coxinha', 'salgados-sortidos', 'empada-aberta', 'docinhos-festa', 'kit-festa');

INSERT INTO product_sizes (product_id, size_id, label, price) VALUES
  ('coxinha', 'pequeno', 'Pequeno - 50 un.', 45.00),
  ('coxinha', 'media', 'Media - 30 un.', 54.00),
  ('coxinha', 'grande', 'Grande - 10 un.', 62.00),
  ('salgados-sortidos', 'pequeno', 'Pequeno - 50 un.', 58.00),
  ('salgados-sortidos', 'media', 'Media - 100 un.', 108.00),
  ('salgados-sortidos', 'grande', 'Grande - 150 un.', 156.00),
  ('empada-aberta', 'pequeno', 'Pequeno - 25 un.', 72.00),
  ('empada-aberta', 'media', 'Media - 50 un.', 135.00),
  ('empada-aberta', 'grande', 'Grande - 100 un.', 255.00),
  ('bolo-decorado', '15cm', '15 cm - ate 12 fatias', 95.00),
  ('bolo-decorado', '20cm', '20 cm - ate 22 fatias', 145.00),
  ('bolo-decorado', '25cm', '25 cm - ate 35 fatias', 220.00),
  ('bolo-decorado', '30cm', '30 cm - ate 50 fatias', 320.00),
  ('bolo-caseiro', 'pequeno', 'Pequeno - 18 cm', 45.00),
  ('bolo-caseiro', 'medio', 'Medio - 22 cm', 68.00),
  ('bolo-caseiro', 'grande', 'Grande - 26 cm', 92.00),
  ('docinhos-festa', 'pequeno', 'Pequeno - 50 un.', 60.00),
  ('docinhos-festa', 'media', 'Media - 100 un.', 110.00),
  ('docinhos-festa', 'grande', 'Grande - 200 un.', 205.00),
  ('brigadeiro-gourmet', '20un', 'Caixa - 20 un.', 72.00),
  ('brigadeiro-gourmet', '50un', 'Caixa - 50 un.', 165.00),
  ('brigadeiro-gourmet', '100un', 'Caixa - 100 un.', 310.00),
  ('kit-festa', 'pequeno', 'Pequeno - 20 pessoas', 189.00),
  ('kit-festa', 'medio', 'Medio - 40 pessoas', 329.00),
  ('kit-festa', 'grande', 'Grande - 70 pessoas', 549.00)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  price = VALUES(price);
