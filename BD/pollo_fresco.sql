-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-01-2026 a las 05:22:10
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `pollo_fresco`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `cliente_id` int(11) NOT NULL,
  `dni` char(8) DEFAULT NULL,
  `nombres` varchar(80) NOT NULL,
  `apellidos` varchar(80) NOT NULL,
  `celular` char(9) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `ruc` char(11) DEFAULT NULL,
  `direccion_fiscal` varchar(200) DEFAULT NULL,
  `referencias` varchar(250) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras_lote`
--

CREATE TABLE `compras_lote` (
  `compra_lote_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `proveedor_id` int(11) DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `costo_lote` decimal(10,2) NOT NULL,
  `estado` enum('ABIERTO','CERRADO') NOT NULL DEFAULT 'ABIERTO',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras_lote_detalle`
--

CREATE TABLE `compras_lote_detalle` (
  `compra_lote_detalle_id` int(11) NOT NULL,
  `compra_lote_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `config_parametros`
--

CREATE TABLE `config_parametros` (
  `parametro_id` int(11) NOT NULL,
  `clave` varchar(60) NOT NULL,
  `valor` varchar(200) NOT NULL,
  `actualizado_por` int(11) NOT NULL,
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `entregas_proveedor`
--

CREATE TABLE `entregas_proveedor` (
  `entrega_id` int(11) NOT NULL,
  `proveedor_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_entrega` date NOT NULL,
  `cantidad_pollos` int(11) NOT NULL,
  `peso_total_kg` decimal(10,2) NOT NULL,
  `merma_kg` decimal(10,2) NOT NULL DEFAULT 0.00,
  `costo_total` decimal(10,2) NOT NULL,
  `observacion` varchar(250) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gastos`
--

CREATE TABLE `gastos` (
  `gasto_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  `fecha` date NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gasto_categorias`
--

CREATE TABLE `gasto_categorias` (
  `categoria_id` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `otros_productos_ventas`
--

CREATE TABLE `otros_productos_ventas` (
  `venta_op_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `compra_lote_id` int(11) NOT NULL,
  `tipo` enum('CONGELADO','HUEVO') NOT NULL,
  `fecha_venta` date NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `otros_productos_venta_detalle`
--

CREATE TABLE `otros_productos_venta_detalle` (
  `venta_op_detalle_id` int(11) NOT NULL,
  `venta_op_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `otros_productos_ventas_diarias`
--

CREATE TABLE `otros_productos_ventas_diarias` (
  `venta_op_diaria_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo` enum('CONGELADO','HUEVO') NOT NULL,
  `fecha` date NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `cerrado` tinyint(1) NOT NULL DEFAULT 0,
  `cerrado_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `otros_productos_ventas_diarias_detalle`
--

CREATE TABLE `otros_productos_ventas_diarias_detalle` (
  `venta_op_diaria_detalle_id` int(11) NOT NULL,
  `venta_op_diaria_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `pedido_id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `vendedor_usuario_id` int(11) NOT NULL,
  `delivery_usuario_id` int(11) DEFAULT NULL,
  `estado_id` int(11) NOT NULL,
  `fecha_hora_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_hora_entrega` datetime DEFAULT NULL,
  `motivo_cancelacion` varchar(250) DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `foto_frontis_url` varchar(255) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_detalle`
--

CREATE TABLE `pedido_detalle` (
  `pedido_detalle_id` int(11) NOT NULL,
  `pedido_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL DEFAULT 1.00,
  `peso_kg` decimal(10,2) DEFAULT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_estados`
--

CREATE TABLE `pedido_estados` (
  `estado_id` int(11) NOT NULL,
  `nombre` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedido_estados`
--

INSERT INTO `pedido_estados` (`estado_id`, `nombre`) VALUES
(3, 'CANCELADO'),
(2, 'ENTREGADO'),
(1, 'PENDIENTE');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_pagos`
--

CREATE TABLE `pedido_pagos` (
  `pedido_pago_id` int(11) NOT NULL,
  `pedido_id` int(11) NOT NULL,
  `registrado_por` int(11) NOT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT current_timestamp(),
  `estado_pago` enum('COMPLETO','PENDIENTE','PARCIAL') NOT NULL,
  `pago_parcial` decimal(10,2) DEFAULT NULL,
  `vuelto` decimal(10,2) NOT NULL DEFAULT 0.00
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `producto_id` int(11) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `proveedor_id` int(11) NOT NULL,
  `dni` char(8) DEFAULT NULL,
  `nombres` varchar(80) NOT NULL,
  `apellidos` varchar(80) NOT NULL,
  `ruc` char(11) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `telefono` char(9) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `rol_id` int(11) NOT NULL,
  `nombre` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`rol_id`, `nombre`) VALUES
(1, 'ADMINISTRADOR'),
(3, 'DELIVERY'),
(2, 'VENDEDOR');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `usuario_id` int(11) NOT NULL,
  `rol_id` int(11) NOT NULL,
  `nombres` varchar(80) NOT NULL,
  `apellidos` varchar(80) NOT NULL,
  `usuario` varchar(60) NOT NULL,
  `email` varchar(120) NOT NULL,
  `telefono` char(9) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `venta_id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT current_timestamp(),
  `total` decimal(10,2) NOT NULL DEFAULT 0.00
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta_detalle`
--

CREATE TABLE `venta_detalle` (
  `venta_detalle_id` int(11) NOT NULL,
  `venta_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`cliente_id`),
  ADD UNIQUE KEY `dni` (`dni`),
  ADD UNIQUE KEY `ruc` (`ruc`);

--
-- Indices de la tabla `compras_lote`
--
ALTER TABLE `compras_lote`
  ADD PRIMARY KEY (`compra_lote_id`),
  ADD KEY `fk_clote_usuario` (`usuario_id`),
  ADD KEY `fk_clote_proveedor` (`proveedor_id`);

--
-- Indices de la tabla `compras_lote_detalle`
--
ALTER TABLE `compras_lote_detalle`
  ADD PRIMARY KEY (`compra_lote_detalle_id`),
  ADD KEY `fk_cldet_lote` (`compra_lote_id`),
  ADD KEY `fk_cldet_producto` (`producto_id`);

--
-- Indices de la tabla `config_parametros`
--
ALTER TABLE `config_parametros`
  ADD PRIMARY KEY (`parametro_id`),
  ADD UNIQUE KEY `clave` (`clave`),
  ADD KEY `fk_param_usuario` (`actualizado_por`);

--
-- Indices de la tabla `entregas_proveedor`
--
ALTER TABLE `entregas_proveedor`
  ADD PRIMARY KEY (`entrega_id`),
  ADD KEY `fk_entrega_proveedor` (`proveedor_id`),
  ADD KEY `fk_entrega_usuario` (`usuario_id`);

--
-- Indices de la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD PRIMARY KEY (`gasto_id`),
  ADD KEY `fk_gasto_usuario` (`usuario_id`),
  ADD KEY `fk_gasto_categoria` (`categoria_id`);

--
-- Indices de la tabla `gasto_categorias`
--
ALTER TABLE `gasto_categorias`
  ADD PRIMARY KEY (`categoria_id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `otros_productos_ventas`
--
ALTER TABLE `otros_productos_ventas`
  ADD PRIMARY KEY (`venta_op_id`),
  ADD KEY `fk_opventa_lote` (`compra_lote_id`),
  ADD KEY `fk_opventa_usuario` (`usuario_id`);

--
-- Indices de la tabla `otros_productos_venta_detalle`
--
ALTER TABLE `otros_productos_venta_detalle`
  ADD PRIMARY KEY (`venta_op_detalle_id`),
  ADD KEY `fk_opvdet_venta` (`venta_op_id`),
  ADD KEY `fk_opvdet_producto` (`producto_id`);

--
-- Indices de la tabla `otros_productos_ventas_diarias`
--
ALTER TABLE `otros_productos_ventas_diarias`
  ADD PRIMARY KEY (`venta_op_diaria_id`),
  ADD KEY `fk_opvd_usuario` (`usuario_id`);

--
-- Indices de la tabla `otros_productos_ventas_diarias_detalle`
--
ALTER TABLE `otros_productos_ventas_diarias_detalle`
  ADD PRIMARY KEY (`venta_op_diaria_detalle_id`),
  ADD KEY `fk_opvdd_venta` (`venta_op_diaria_id`),
  ADD KEY `fk_opvdd_producto` (`producto_id`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`pedido_id`),
  ADD KEY `fk_pedido_cliente` (`cliente_id`),
  ADD KEY `fk_pedido_vendedor` (`vendedor_usuario_id`),
  ADD KEY `fk_pedido_delivery` (`delivery_usuario_id`),
  ADD KEY `fk_pedido_estado` (`estado_id`);

--
-- Indices de la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD PRIMARY KEY (`pedido_detalle_id`),
  ADD KEY `fk_pdetalle_pedido` (`pedido_id`),
  ADD KEY `fk_pdetalle_producto` (`producto_id`);

--
-- Indices de la tabla `pedido_estados`
--
ALTER TABLE `pedido_estados`
  ADD PRIMARY KEY (`estado_id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `pedido_pagos`
--
ALTER TABLE `pedido_pagos`
  ADD PRIMARY KEY (`pedido_pago_id`),
  ADD KEY `fk_ppago_pedido` (`pedido_id`),
  ADD KEY `fk_ppago_usuario` (`registrado_por`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`producto_id`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`proveedor_id`),
  ADD UNIQUE KEY `dni` (`dni`),
  ADD UNIQUE KEY `ruc` (`ruc`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`rol_id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`usuario_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_usuarios_roles` (`rol_id`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`venta_id`),
  ADD KEY `fk_venta_cliente` (`cliente_id`),
  ADD KEY `fk_venta_usuario` (`usuario_id`);

--
-- Indices de la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  ADD PRIMARY KEY (`venta_detalle_id`),
  ADD KEY `fk_vdet_venta` (`venta_id`),
  ADD KEY `fk_vdet_producto` (`producto_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `cliente_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compras_lote`
--
ALTER TABLE `compras_lote`
  MODIFY `compra_lote_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compras_lote_detalle`
--
ALTER TABLE `compras_lote_detalle`
  MODIFY `compra_lote_detalle_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `config_parametros`
--
ALTER TABLE `config_parametros`
  MODIFY `parametro_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `entregas_proveedor`
--
ALTER TABLE `entregas_proveedor`
  MODIFY `entrega_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `gastos`
--
ALTER TABLE `gastos`
  MODIFY `gasto_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `gasto_categorias`
--
ALTER TABLE `gasto_categorias`
  MODIFY `categoria_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `otros_productos_ventas`
--
ALTER TABLE `otros_productos_ventas`
  MODIFY `venta_op_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `otros_productos_venta_detalle`
--
ALTER TABLE `otros_productos_venta_detalle`
  MODIFY `venta_op_detalle_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `otros_productos_ventas_diarias`
--
ALTER TABLE `otros_productos_ventas_diarias`
  MODIFY `venta_op_diaria_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `otros_productos_ventas_diarias_detalle`
--
ALTER TABLE `otros_productos_ventas_diarias_detalle`
  MODIFY `venta_op_diaria_detalle_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `pedido_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  MODIFY `pedido_detalle_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pedido_estados`
--
ALTER TABLE `pedido_estados`
  MODIFY `estado_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `pedido_pagos`
--
ALTER TABLE `pedido_pagos`
  MODIFY `pedido_pago_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `producto_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `proveedor_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `rol_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `usuario_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `venta_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  MODIFY `venta_detalle_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `compras_lote`
--
ALTER TABLE `compras_lote`
  ADD CONSTRAINT `fk_clote_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`),
  ADD CONSTRAINT `fk_clote_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`proveedor_id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `compras_lote_detalle`
--
ALTER TABLE `compras_lote_detalle`
  ADD CONSTRAINT `fk_cldet_lote` FOREIGN KEY (`compra_lote_id`) REFERENCES `compras_lote` (`compra_lote_id`),
  ADD CONSTRAINT `fk_cldet_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`);

--
-- Filtros para la tabla `config_parametros`
--
ALTER TABLE `config_parametros`
  ADD CONSTRAINT `fk_param_usuario` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`usuario_id`);

--
-- Filtros para la tabla `entregas_proveedor`
--
ALTER TABLE `entregas_proveedor`
  ADD CONSTRAINT `fk_entrega_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`proveedor_id`),
  ADD CONSTRAINT `fk_entrega_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Filtros para la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD CONSTRAINT `fk_gasto_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `gasto_categorias` (`categoria_id`),
  ADD CONSTRAINT `fk_gasto_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Filtros para la tabla `otros_productos_ventas`
--
ALTER TABLE `otros_productos_ventas`
  ADD CONSTRAINT `fk_opventa_lote` FOREIGN KEY (`compra_lote_id`) REFERENCES `compras_lote` (`compra_lote_id`),
  ADD CONSTRAINT `fk_opventa_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Filtros para la tabla `otros_productos_venta_detalle`
--
ALTER TABLE `otros_productos_venta_detalle`
  ADD CONSTRAINT `fk_opvdet_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`),
  ADD CONSTRAINT `fk_opvdet_venta` FOREIGN KEY (`venta_op_id`) REFERENCES `otros_productos_ventas` (`venta_op_id`);

--
-- Filtros para la tabla `otros_productos_ventas_diarias`
--
ALTER TABLE `otros_productos_ventas_diarias`
  ADD CONSTRAINT `fk_opvd_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Filtros para la tabla `otros_productos_ventas_diarias_detalle`
--
ALTER TABLE `otros_productos_ventas_diarias_detalle`
  ADD CONSTRAINT `fk_opvdd_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`),
  ADD CONSTRAINT `fk_opvdd_venta` FOREIGN KEY (`venta_op_diaria_id`) REFERENCES `otros_productos_ventas_diarias` (`venta_op_diaria_id`);

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `fk_pedido_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`cliente_id`),
  ADD CONSTRAINT `fk_pedido_delivery` FOREIGN KEY (`delivery_usuario_id`) REFERENCES `usuarios` (`usuario_id`),
  ADD CONSTRAINT `fk_pedido_estado` FOREIGN KEY (`estado_id`) REFERENCES `pedido_estados` (`estado_id`),
  ADD CONSTRAINT `fk_pedido_vendedor` FOREIGN KEY (`vendedor_usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Filtros para la tabla `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD CONSTRAINT `fk_pdetalle_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`pedido_id`),
  ADD CONSTRAINT `fk_pdetalle_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`);

--
-- Filtros para la tabla `pedido_pagos`
--
ALTER TABLE `pedido_pagos`
  ADD CONSTRAINT `fk_ppago_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`pedido_id`),
  ADD CONSTRAINT `fk_ppago_usuario` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`usuario_id`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`rol_id`);

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_venta_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`cliente_id`),
  ADD CONSTRAINT `fk_venta_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Filtros para la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  ADD CONSTRAINT `fk_vdet_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`),
  ADD CONSTRAINT `fk_vdet_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`venta_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
