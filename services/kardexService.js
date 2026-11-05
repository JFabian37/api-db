const { Transaction } = require('sequelize');
const { sequelize, Producto, Movimiento } = require('../models');
const ApiError = require('../utils/ApiError');

const TIPOS = ['Entrada', 'Salida', 'Ajuste'];

// Number('') y Number(null) dan 0: un Ajuste vacio dejaria el stock en cero
const leerCantidad = (valor) => (valor === '' || valor === null || valor === undefined ? NaN : Number(valor));

const validarDatos = (productoId, tipo, cantidad) => {
    if (!productoId) {
        throw new ApiError(400, 'Datos inválidos', { producto_id: 'El producto es obligatorio' });
    }

    if (!TIPOS.includes(tipo)) {
        throw new ApiError(400, 'Datos inválidos', { tipo_movimiento: 'El tipo de movimiento no es válido' });
    }

    const minimo = tipo === 'Ajuste' ? 0 : 1;
    if (!Number.isInteger(cantidad) || cantidad < minimo) {
        throw new ApiError(400, 'Datos inválidos', {
            cantidad: `La cantidad debe ser un entero mayor o igual a ${minimo}`
        });
    }
};

const calcularStockNuevo = (tipo, stockActual, cantidad) => {
    if (tipo === 'Entrada') return stockActual + cantidad;
    if (tipo === 'Ajuste') return cantidad;

    if (cantidad > stockActual) {
        throw new ApiError(409, `Stock insuficiente: disponible ${stockActual}, solicitado ${cantidad}`);
    }
    return stockActual - cantidad;
};

// La fila del producto queda bloqueada hasta el fin de la transaccion: asi dos
// movimientos simultaneos no pueden calcular el stock a partir del mismo valor
const aplicarMovimiento = async (datos, transaction) => {
    const { producto_id, usuario_id, proveedor_id, tipo_movimiento, fecha_hora, observaciones } = datos;
    const cantidad = leerCantidad(datos.cantidad);

    validarDatos(producto_id, tipo_movimiento, cantidad);

    const producto = await Producto.findByPk(producto_id, {
        transaction,
        lock: Transaction.LOCK.UPDATE
    });

    if (!producto) throw new ApiError(404, 'Producto no encontrado');
    if (!producto.activo) throw new ApiError(409, 'El producto está inactivo y no acepta movimientos');

    const stock_anterior = producto.stock;
    const stock_nuevo = calcularStockNuevo(tipo_movimiento, stock_anterior, cantidad);

    await producto.update({ stock: stock_nuevo }, { transaction });

    return Movimiento.create({
        producto_id,
        usuario_id,
        proveedor_id: proveedor_id || null,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        fecha_hora,
        observaciones
    }, { transaction });
};

// Acepta una transaccion externa para que crear un producto y su stock inicial sea atomico
const registrarMovimiento = (datos, { transaction } = {}) => {
    if (transaction) return aplicarMovimiento(datos, transaction);
    return sequelize.transaction((t) => aplicarMovimiento(datos, t));
};

// Revierte la diferencia que causo el movimiento, no vuelve a stock_anterior:
// asi no se pierde el efecto de los movimientos registrados despues
const anularMovimiento = (id) => sequelize.transaction(async (transaction) => {
    const movimiento = await Movimiento.findByPk(id, { transaction, lock: Transaction.LOCK.UPDATE });

    if (!movimiento) throw new ApiError(404, 'Movimiento no encontrado');
    if (movimiento.anulado) throw new ApiError(409, 'El movimiento ya fue anulado');

    const producto = await Producto.findByPk(movimiento.producto_id, {
        transaction,
        lock: Transaction.LOCK.UPDATE
    });

    const stockRevertido = producto.stock - (movimiento.stock_nuevo - movimiento.stock_anterior);
    if (stockRevertido < 0) {
        throw new ApiError(409, `No se puede anular: el stock quedaría en ${stockRevertido}`);
    }

    await producto.update({ stock: stockRevertido }, { transaction });
    await movimiento.update({ anulado: true }, { transaction });

    return movimiento;
});

module.exports = { TIPOS, registrarMovimiento, anularMovimiento };
