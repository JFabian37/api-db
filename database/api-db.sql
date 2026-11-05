-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: api-db
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `api-db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `api-db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `api-db`;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categorias_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Accesorios','Mouse, teclados y otros accesorios de escritorio',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(2,'Almacenamiento','Discos SSD, discos externos y memorias USB',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(3,'Componentes','Memorias RAM, fuentes y tarjetas',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(4,'Monitores','Monitores y soportes',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(5,'Redes','Routers, switches y cableado',1,'2026-11-05 19:43:59','2026-11-05 19:43:59');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos`
--

DROP TABLE IF EXISTS `movimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `proveedor_id` int DEFAULT NULL,
  `tipo_movimiento` enum('Entrada','Salida','Ajuste') NOT NULL,
  `cantidad` int NOT NULL,
  `stock_anterior` int NOT NULL,
  `stock_nuevo` int NOT NULL,
  `fecha_hora` datetime NOT NULL,
  `observaciones` text,
  `anulado` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `proveedor_id` (`proveedor_id`),
  CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `movimientos_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `movimientos_ibfk_3` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos`
--

LOCK TABLES `movimientos` WRITE;
/*!40000 ALTER TABLE `movimientos` DISABLE KEYS */;
INSERT INTO `movimientos` VALUES (1,1,2,1,'Entrada',40,0,40,'2026-10-11 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(2,1,2,NULL,'Salida',12,40,28,'2026-10-14 19:43:59','Despacho de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(3,2,2,1,'Entrada',30,0,30,'2026-10-12 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(4,2,2,NULL,'Salida',25,30,5,'2026-10-15 19:43:59','Despacho de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(5,3,2,5,'Entrada',18,0,18,'2026-10-13 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(6,4,2,5,'Entrada',3,0,3,'2026-10-14 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(7,5,2,3,'Entrada',24,0,24,'2026-10-15 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(8,5,2,NULL,'Salida',6,24,18,'2026-10-18 19:43:59','Despacho de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(9,6,2,3,'Entrada',12,0,12,'2026-10-16 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(10,7,2,2,'Entrada',20,0,20,'2026-10-17 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(11,7,2,NULL,'Salida',9,20,11,'2026-10-20 19:43:59','Despacho de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(12,8,2,2,'Entrada',16,0,16,'2026-10-18 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(13,9,2,2,'Entrada',7,0,7,'2026-10-19 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(14,10,2,3,'Entrada',5,0,5,'2026-10-20 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(15,10,1,NULL,'Ajuste',4,5,4,'2026-10-23 19:43:59','Conteo fisico',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(16,11,2,3,'Entrada',10,0,10,'2026-10-21 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(17,12,2,3,'Entrada',2,0,2,'2026-10-22 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(18,13,2,4,'Entrada',14,0,14,'2026-10-23 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(19,14,2,4,'Entrada',9,0,9,'2026-10-24 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(20,15,2,4,'Entrada',11,0,11,'2026-10-25 19:43:59','Stock inicial de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(21,15,2,NULL,'Salida',8,11,3,'2026-10-28 19:43:59','Despacho de ejemplo',0,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(22,16,1,3,'Entrada',10,0,10,'2026-11-05 20:47:56','Stock inicial',0,'2026-11-05 20:47:56','2026-11-05 20:47:56'),(23,17,1,3,'Entrada',10,0,10,'2026-11-05 21:10:56','Stock inicial',0,'2026-11-05 21:10:56','2026-11-05 21:10:56');
/*!40000 ALTER TABLE `movimientos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text,
  `precio` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `stock_minimo` int NOT NULL DEFAULT '5',
  `categoria_id` int NOT NULL,
  `proveedor_id` int DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_productos_codigo` (`codigo`),
  KEY `categoria_id` (`categoria_id`),
  KEY `proveedor_id` (`proveedor_id`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'P-0001','Mouse USB','Mouse USB para inventario de ejemplo',25.50,28,10,1,1,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(2,'P-0002','Teclado USB','Teclado USB para inventario de ejemplo',49.90,5,8,1,1,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(3,'P-0003','Audifonos con microfono','Audifonos con microfono para inventario de ejemplo',79.00,18,5,1,5,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(4,'P-0004','Base para laptop','Base para laptop para inventario de ejemplo',65.00,3,5,1,5,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(5,'P-0005','SSD 480 GB','SSD 480 GB para inventario de ejemplo',139.90,18,6,2,3,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(6,'P-0006','SSD 1 TB','SSD 1 TB para inventario de ejemplo',249.00,12,4,2,3,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(7,'P-0007','Memoria USB 64 GB','Memoria USB 64 GB para inventario de ejemplo',29.90,11,15,2,2,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(8,'P-0008','Memoria RAM 16 GB','Memoria RAM 16 GB para inventario de ejemplo',189.00,16,5,3,2,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(9,'P-0009','Fuente 650 W','Fuente 650 W para inventario de ejemplo',299.00,7,3,3,2,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(10,'P-0010','Tarjeta de video 8 GB','Tarjeta de video 8 GB para inventario de ejemplo',1299.00,4,2,3,3,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(11,'P-0011','Monitor 24 pulgadas','Monitor 24 pulgadas para inventario de ejemplo',649.00,10,4,4,3,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(12,'P-0012','Monitor 27 pulgadas','Monitor 27 pulgadas para inventario de ejemplo',899.00,2,3,4,3,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(13,'P-0013','Router WiFi 6','Router WiFi 6 para inventario de ejemplo',229.00,14,5,5,4,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(14,'P-0014','Switch 8 puertos','Switch 8 puertos para inventario de ejemplo',119.00,9,4,5,4,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(15,'P-0015','Cable de red Cat6 305 m','Cable de red Cat6 305 m para inventario de ejemplo',349.00,3,5,5,4,1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(16,'P-0016','Monitor 32 pulgadas','',780.00,10,2,4,3,0,'2026-11-05 20:47:56','2026-11-05 20:48:08'),(17,'P-0017','Monitor 32 pulgadas','',850.00,10,3,4,3,1,'2026-11-05 21:10:56','2026-11-05 21:10:56');
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `razon_social` varchar(150) NOT NULL,
  `ruc` varchar(11) DEFAULT NULL,
  `contacto` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedores`
--

LOCK TABLES `proveedores` WRITE;
/*!40000 ALTER TABLE `proveedores` DISABLE KEYS */;
INSERT INTO `proveedores` VALUES (1,'Distribuidora Andina SAC','20999000001','Ana Quispe','900000001','ventas@andina.example.com',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(2,'Global Partes SAC','20999000002','Luis Rojas','900000002','contacto@globalpartes.example.com',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(3,'Compu Mayorista SAC','20999000003','Rosa Vargas','900000003','pedidos@compumayorista.example.com',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(4,'Redes del Sur EIRL','20999000004','Carlos Huaman','900000004','ventas@redesdelsur.example.com',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(5,'Suministros Lima SAC','20999000005','Elena Flores','900000005','atencion@suministroslima.example.com',1,'2026-11-05 19:43:59','2026-11-05 19:43:59');
/*!40000 ALTER TABLE `proveedores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(100) NOT NULL,
  `rol` enum('Administrador','Almacenero','Supervisor') NOT NULL DEFAULT 'Almacenero',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Administrador','admin@inventario.test','$2b$10$ugk0BBdbp8Mj6e7IJJjdAuh5kjJsYeiblh8nMQ9QHbMK8xVNP4NYC','Administrador',1,'2026-11-05 19:43:59','2026-11-05 19:43:59'),(2,'Almacenero','almacenero@inventario.test','$2b$10$4AHXmasyZcX/4vLKETzDU.GpcIwHSPN5QYH998bECRu0n.NxNycLi','Almacenero',1,'2026-11-05 19:43:59','2026-11-05 19:43:59');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'api-db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
