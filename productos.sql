-- 1. Insertar Categorías
INSERT INTO `categoria` (`nombre`) VALUES
('Remeras'),
('Pantalones'),
('Abrigos'),
('Accesorios');

-- 2. Insertar Usuarios (Incluye un admin y dos clientes de prueba)
INSERT INTO `usuario` (`nombre`, `apellido`, `email`, `password`, `direccion`, `telefono`, `rol`) VALUES
('Admin', 'Principal', 'admin@lanaylino.com', 'admin123', 'San Martin 2020, Santa Fe', '3421234567', 'admin'),
('Cliente', 'Uno', 'cliente1@gmail.com', '123456', 'Av. Lujan 3000, Santo Tome', '3427654321', 'cliente'),
('Cliente', 'Dos', 'cliente2@gmail.com', '123456', 'Bulevar Galvez 1500, Santa Fe', '3429998888', 'cliente');

-- 3. Insertar Productos (Asociados a las categorías creadas)
INSERT INTO `producto` (`nombre`, `descripcion`, `precio`, `genero`, `id_categoria`, `imagen`) VALUES
('Remera Basica Algodon', 'Remera 100% algodon peinado de alta calidad', 15000.00, 'Unisex', 1, 'images/remera_basica.jpg'),
('Pantalon Cargo', 'Pantalon cargo con multiples bolsillos reforzados', 35000.00, 'Hombre', 2, 'images/cargo_negro.jpg'),
('Buzo Canguro Lino', 'Buzo de medio tiempo ideal para la noche', 45000.00, 'Mujer', 3, 'images/buzo_lino.jpg'),
('Gorra Urbana', 'Gorra con ajuste regulable', 12000.00, 'Unisex', 4, 'images/gorra_urbana.jpg');

-- 4. Insertar Inventario (Asociado a los productos)
INSERT INTO `inventario` (`talle`, `color`, `stock`, `id_producto`) VALUES
('M', 'Blanco', 50, 1),
('L', 'Negro', 30, 1),
('42', 'Verde Oliva', 15, 2),
('44', 'Negro', 10, 2),
('S', 'Beige', 20, 3),
('Unico', 'Negro', 100, 4);

-- 5. Insertar Pedidos (Asociados a los usuarios)
-- Nota: 'estado' es int, asumimos 1 = Pendiente, 2 = Pagado, 3 = Enviado
INSERT INTO `pedido` (`fecha_pedido`, `total`, `metodo_pago`, `estado`, `id_usuario`) VALUES
('2026-06-10', 15000.00, 'MercadoPago', 1, 2),
('2026-06-12', 80000.00, 'Transferencia', 2, 3),
('2026-06-15', 12000.00, 'Tarjeta', 3, 2);

-- 6. Insertar Detalle de Pedidos (Asociados a pedidos e inventario)
INSERT INTO `detalle_pedido` (`cantidad`, `precio_unitario`, `id_pedido`, `id_inventario`) VALUES
(1, 15000.00, 1, 1),  -- 1 Remera M Blanca para el Pedido 1
(1, 35000.00, 2, 3),  -- 1 Pantalon 42 Verde Oliva para el Pedido 2
(1, 45000.00, 2, 5),  -- 1 Buzo S Beige para el Pedido 2
(1, 12000.00, 3, 6);  -- 1 Gorra para el Pedido 3

-- 7. Insertar Favoritos (Asociados a usuarios y productos)
INSERT INTO `favorito` (`id_usuario`, `id_producto`) VALUES
(2, 2), -- Cliente Uno marcó como favorito el Pantalon Cargo
(2, 4), -- Cliente Uno marcó como favorito la Gorra
(3, 1); -- Cliente Dos marcó como favorito la Remera Basica