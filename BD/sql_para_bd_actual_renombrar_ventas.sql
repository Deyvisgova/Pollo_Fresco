-- Script para ejecutar en la BD actual (phpMyAdmin / MySQL)
-- Objetivo: dejar tablas como `ventas` y `venta_detalle` sin errores de FK ni duplicidad de columnas.

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Eliminar tablas antiguas (si existen)
DROP TABLE IF EXISTS `venta_detalle`;
DROP TABLE IF EXISTS `ventas`;

-- 2) Renombrar tablas nuevas de comprobantes -> ventas (solo si existen)
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comprobantes_venta'
    ),
    'RENAME TABLE `comprobantes_venta` TO `ventas`',
    'SELECT "Tabla comprobantes_venta no existe"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comprobantes_venta_detalle'
    ),
    'RENAME TABLE `comprobantes_venta_detalle` TO `venta_detalle`',
    'SELECT "Tabla comprobantes_venta_detalle no existe"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Normalizar tipos para evitar Error 150 de FK
-- usuarios.usuario_id es INT UNSIGNED en Laravel, así que ventas.usuario_id debe coincidir.
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ventas'
        AND COLUMN_NAME = 'usuario_id'
    ),
    'ALTER TABLE `ventas` MODIFY `usuario_id` INT UNSIGNED NOT NULL',
    'SELECT "Columna ventas.usuario_id no existe"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) Re-crear FK detalle -> ventas (limpia)
SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'venta_detalle'
        AND CONSTRAINT_NAME = 'fk_vdet_venta'
    ),
    'ALTER TABLE `venta_detalle` DROP FOREIGN KEY `fk_vdet_venta`',
    'SELECT "FK fk_vdet_venta no existe"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'venta_detalle'
        AND COLUMN_NAME = 'comprobante_venta_id'
    ),
    'ALTER TABLE `venta_detalle` ADD CONSTRAINT `fk_vdet_venta` FOREIGN KEY (`comprobante_venta_id`) REFERENCES `ventas` (`comprobante_venta_id`) ON DELETE CASCADE',
    'SELECT "Columna venta_detalle.comprobante_venta_id no existe"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
