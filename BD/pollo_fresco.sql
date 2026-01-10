-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jan 10, 2026 at 12:58 PM
-- Server version: 8.4.3
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pollo_fresco`
--

-- --------------------------------------------------------

--
-- Table structure for table `clientes`
--

CREATE TABLE `clientes` (
  `cliente_id` int NOT NULL,
  `dni` char(8) DEFAULT NULL,
  `nombres` varchar(80) NOT NULL,
  `apellidos` varchar(80) NOT NULL,
  `celular` char(9) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `ruc` char(11) DEFAULT NULL,
  `direccion_fiscal` varchar(200) DEFAULT NULL,
  `referencias` varchar(250) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `compras_lote`
--

CREATE TABLE `compras_lote` (
  `compra_lote_id` int NOT NULL,
  `tipo` enum('CONGELADO','HUEVO') NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha_ingreso` date NOT NULL,
  `costo_lote` decimal(10,2) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `compras_lote_detalle`
--

CREATE TABLE `compras_lote_detalle` (
  `compra_lote_detalle_id` int NOT NULL,
  `compra_lote_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `costo_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `config_parametros`
--

CREATE TABLE `config_parametros` (
  `parametro_id` int NOT NULL,
  `clave` varchar(60) NOT NULL,
  `valor` varchar(200) NOT NULL,
  `actualizado_por` int NOT NULL,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `entregas_proveedor`
--

CREATE TABLE `entregas_proveedor` (
  `entrega_id` int NOT NULL,
  `proveedor_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha_entrega` date NOT NULL,
  `cantidad_pollos` int NOT NULL,
  `peso_total_kg` decimal(10,2) NOT NULL,
  `merma_kg` decimal(10,2) NOT NULL DEFAULT '0.00',
  `costo_total` decimal(10,2) NOT NULL,
  `observacion` varchar(250) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `otros_productos_ventas`
--

CREATE TABLE `otros_productos_ventas` (
  `venta_op_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha_venta` date NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `otros_productos_venta_detalle`
--

CREATE TABLE `otros_productos_venta_detalle` (
  `venta_op_detalle_id` int NOT NULL,
  `venta_op_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `pedidos`
--

CREATE TABLE `pedidos` (
  `pedido_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `vendedor_usuario_id` int NOT NULL,
  `delivery_usuario_id` int DEFAULT NULL,
  `estado_id` int NOT NULL,
  `fecha_hora_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_hora_entrega` datetime DEFAULT NULL,
  `motivo_cancelacion` varchar(250) DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `foto_frontis_url` varchar(255) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pedido_detalle`
--

CREATE TABLE `pedido_detalle` (
  `pedido_detalle_id` int NOT NULL,
  `pedido_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL DEFAULT '1.00',
  `peso_kg` decimal(10,2) DEFAULT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `pedido_estados`
--

CREATE TABLE `pedido_estados` (
  `estado_id` int NOT NULL,
  `nombre` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pedido_estados`
--

INSERT INTO `pedido_estados` (`estado_id`, `nombre`) VALUES
(3, 'CANCELADO'),
(2, 'ENTREGADO'),
(1, 'PENDIENTE');

-- --------------------------------------------------------

--
-- Table structure for table `pedido_pagos`
--

CREATE TABLE `pedido_pagos` (
  `pedido_pago_id` int NOT NULL,
  `pedido_id` int NOT NULL,
  `registrado_por` int NOT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado_pago` enum('COMPLETO','PENDIENTE','PARCIAL') NOT NULL,
  `pago_parcial` decimal(10,2) DEFAULT NULL,
  `vuelto` decimal(10,2) NOT NULL DEFAULT '0.00'
) ;

-- --------------------------------------------------------

--
-- Table structure for table `productos`
--

CREATE TABLE `productos` (
  `producto_id` int NOT NULL,
  `tipo` enum('POLLO','CONGELADO','HUEVO') NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `proveedores`
--

CREATE TABLE `proveedores` (
  `proveedor_id` int NOT NULL,
  `dni` char(8) DEFAULT NULL,
  `nombres` varchar(80) NOT NULL,
  `apellidos` varchar(80) NOT NULL,
  `ruc` char(11) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `telefono` char(9) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `rol_id` int NOT NULL,
  `nombre` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`rol_id`, `nombre`) VALUES
(1, 'ADMINISTRADOR'),
(3, 'DELIVERY'),
(2, 'VENDEDOR');

-- --------------------------------------------------------

--
-- Table structure for table `usuarios`
--

CREATE TABLE `usuarios` (
  `usuario_id` int NOT NULL,
  `rol_id` int NOT NULL,
  `nombres` varchar(80) NOT NULL,
  `apellidos` varchar(80) NOT NULL,
  `email` varchar(120) NOT NULL,
  `telefono` char(9) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `ventas`
--

CREATE TABLE `ventas` (
  `venta_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00'
) ;

-- --------------------------------------------------------

--
-- Table structure for table `venta_detalle`
--

CREATE TABLE `venta_detalle` (
  `venta_detalle_id` int NOT NULL,
  `venta_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`cliente_id`),
  ADD UNIQUE KEY `dni` (`dni`),
  ADD UNIQUE KEY `ruc` (`ruc`);

--
-- Indexes for table `compras_lote`
--
ALTER TABLE `compras_lote`
  ADD PRIMARY KEY (`compra_lote_id`),
  ADD KEY `fk_clote_usuario` (`usuario_id`);

--
-- Indexes for table `compras_lote_detalle`
--
ALTER TABLE `compras_lote_detalle`
  ADD PRIMARY KEY (`compra_lote_detalle_id`),
  ADD KEY `fk_cldet_lote` (`compra_lote_id`),
  ADD KEY `fk_cldet_producto` (`producto_id`);

--
-- Indexes for table `config_parametros`
--
ALTER TABLE `config_parametros`
  ADD PRIMARY KEY (`parametro_id`),
  ADD UNIQUE KEY `clave` (`clave`),
  ADD KEY `fk_param_usuario` (`actualizado_por`);

--
-- Indexes for table `entregas_proveedor`
--
ALTER TABLE `entregas_proveedor`
  ADD PRIMARY KEY (`entrega_id`),
  ADD KEY `fk_entrega_proveedor` (`proveedor_id`),
  ADD KEY `fk_entrega_usuario` (`usuario_id`);

--
-- Indexes for table `otros_productos_ventas`
--
ALTER TABLE `otros_productos_ventas`
  ADD PRIMARY KEY (`venta_op_id`),
  ADD KEY `fk_opventa_usuario` (`usuario_id`);

--
-- Indexes for table `otros_productos_venta_detalle`
--
ALTER TABLE `otros_productos_venta_detalle`
  ADD PRIMARY KEY (`venta_op_detalle_id`),
  ADD KEY `fk_opvdet_venta` (`venta_op_id`),
  ADD KEY `fk_opvdet_producto` (`producto_id`);

--
-- Indexes for table `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`pedido_id`),
  ADD KEY `fk_pedido_cliente` (`cliente_id`),
  ADD KEY `fk_pedido_vendedor` (`vendedor_usuario_id`),
  ADD KEY `fk_pedido_delivery` (`delivery_usuario_id`),
  ADD KEY `fk_pedido_estado` (`estado_id`);

--
-- Indexes for table `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD PRIMARY KEY (`pedido_detalle_id`),
  ADD KEY `fk_pdetalle_pedido` (`pedido_id`),
  ADD KEY `fk_pdetalle_producto` (`producto_id`);

--
-- Indexes for table `pedido_estados`
--
ALTER TABLE `pedido_estados`
  ADD PRIMARY KEY (`estado_id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indexes for table `pedido_pagos`
--
ALTER TABLE `pedido_pagos`
  ADD PRIMARY KEY (`pedido_pago_id`),
  ADD KEY `fk_ppago_pedido` (`pedido_id`),
  ADD KEY `fk_ppago_usuario` (`registrado_por`);

--
-- Indexes for table `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`producto_id`),
  ADD UNIQUE KEY `tipo` (`tipo`,`nombre`);

--
-- Indexes for table `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`proveedor_id`),
  ADD UNIQUE KEY `dni` (`dni`),
  ADD UNIQUE KEY `ruc` (`ruc`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`rol_id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indexes for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`usuario_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_usuarios_roles` (`rol_id`);

--
-- Indexes for table `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`venta_id`),
  ADD KEY `fk_venta_cliente` (`cliente_id`),
  ADD KEY `fk_venta_usuario` (`usuario_id`);

--
-- Indexes for table `venta_detalle`
--
ALTER TABLE `venta_detalle`
  ADD PRIMARY KEY (`venta_detalle_id`),
  ADD KEY `fk_vdet_venta` (`venta_id`),
  ADD KEY `fk_vdet_producto` (`producto_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `clientes`
--
ALTER TABLE `clientes`
  MODIFY `cliente_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `compras_lote`
--
ALTER TABLE `compras_lote`
  MODIFY `compra_lote_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `compras_lote_detalle`
--
ALTER TABLE `compras_lote_detalle`
  MODIFY `compra_lote_detalle_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `config_parametros`
--
ALTER TABLE `config_parametros`
  MODIFY `parametro_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `entregas_proveedor`
--
ALTER TABLE `entregas_proveedor`
  MODIFY `entrega_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `otros_productos_ventas`
--
ALTER TABLE `otros_productos_ventas`
  MODIFY `venta_op_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `otros_productos_venta_detalle`
--
ALTER TABLE `otros_productos_venta_detalle`
  MODIFY `venta_op_detalle_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `pedido_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  MODIFY `pedido_detalle_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pedido_estados`
--
ALTER TABLE `pedido_estados`
  MODIFY `estado_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `pedido_pagos`
--
ALTER TABLE `pedido_pagos`
  MODIFY `pedido_pago_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `productos`
--
ALTER TABLE `productos`
  MODIFY `producto_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `proveedor_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `rol_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `usuario_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ventas`
--
ALTER TABLE `ventas`
  MODIFY `venta_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `venta_detalle`
--
ALTER TABLE `venta_detalle`
  MODIFY `venta_detalle_id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `compras_lote`
--
ALTER TABLE `compras_lote`
  ADD CONSTRAINT `fk_clote_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Constraints for table `compras_lote_detalle`
--
ALTER TABLE `compras_lote_detalle`
  ADD CONSTRAINT `fk_cldet_lote` FOREIGN KEY (`compra_lote_id`) REFERENCES `compras_lote` (`compra_lote_id`),
  ADD CONSTRAINT `fk_cldet_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`);

--
-- Constraints for table `config_parametros`
--
ALTER TABLE `config_parametros`
  ADD CONSTRAINT `fk_param_usuario` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`usuario_id`);

--
-- Constraints for table `entregas_proveedor`
--
ALTER TABLE `entregas_proveedor`
  ADD CONSTRAINT `fk_entrega_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`proveedor_id`),
  ADD CONSTRAINT `fk_entrega_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Constraints for table `otros_productos_ventas`
--
ALTER TABLE `otros_productos_ventas`
  ADD CONSTRAINT `fk_opventa_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Constraints for table `otros_productos_venta_detalle`
--
ALTER TABLE `otros_productos_venta_detalle`
  ADD CONSTRAINT `fk_opvdet_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`),
  ADD CONSTRAINT `fk_opvdet_venta` FOREIGN KEY (`venta_op_id`) REFERENCES `otros_productos_ventas` (`venta_op_id`);

--
-- Constraints for table `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `fk_pedido_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`cliente_id`),
  ADD CONSTRAINT `fk_pedido_delivery` FOREIGN KEY (`delivery_usuario_id`) REFERENCES `usuarios` (`usuario_id`),
  ADD CONSTRAINT `fk_pedido_estado` FOREIGN KEY (`estado_id`) REFERENCES `pedido_estados` (`estado_id`),
  ADD CONSTRAINT `fk_pedido_vendedor` FOREIGN KEY (`vendedor_usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Constraints for table `pedido_detalle`
--
ALTER TABLE `pedido_detalle`
  ADD CONSTRAINT `fk_pdetalle_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`pedido_id`),
  ADD CONSTRAINT `fk_pdetalle_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`);

--
-- Constraints for table `pedido_pagos`
--
ALTER TABLE `pedido_pagos`
  ADD CONSTRAINT `fk_ppago_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`pedido_id`),
  ADD CONSTRAINT `fk_ppago_usuario` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`usuario_id`);

--
-- Constraints for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`rol_id`);

--
-- Constraints for table `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_venta_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`cliente_id`),
  ADD CONSTRAINT `fk_venta_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`);

--
-- Constraints for table `venta_detalle`
--
ALTER TABLE `venta_detalle`
  ADD CONSTRAINT `fk_vdet_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`producto_id`),
  ADD CONSTRAINT `fk_vdet_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`venta_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
