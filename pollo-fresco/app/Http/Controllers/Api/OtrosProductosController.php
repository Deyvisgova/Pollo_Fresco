<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OtrosProductosController extends Controller
{
    public function lotesIndex(Request $request)
    {
        $lotes = DB::table('compras_lote as cl')
            ->join('compras_lote_detalle as cld', 'cl.compra_lote_id', '=', 'cld.compra_lote_id')
            ->join('productos as p', 'cld.producto_id', '=', 'p.producto_id')
            ->leftJoin('proveedores as pr', 'cl.proveedor_id', '=', 'pr.proveedor_id')
            ->select([
                'cl.compra_lote_id',
                'cl.proveedor_id',
                'cl.codigo_comprobante',
                'cl.fecha_ingreso',
                'cl.creado_en',
                'cl.estado',
                'p.producto_id',
                'p.nombre as producto_nombre',
                'cld.cantidad',
                'cld.costo_kilo',
                'cld.precio_venta',
                'pr.nombres as proveedor_nombres',
                'pr.apellidos as proveedor_apellidos',
                'pr.nombre_empresa as proveedor_nombre_empresa',
                'pr.ruc as proveedor_ruc',
                'pr.dni as proveedor_dni',
                DB::raw('ROW_NUMBER() OVER (PARTITION BY p.producto_id ORDER BY cl.compra_lote_id) as numero_lote'),
            ])
            ->orderByDesc('cl.compra_lote_id')
            ->get();

        return response()->json($lotes);
    }

    public function productosIndex(Request $request)
    {
        $termino = trim((string) $request->query('buscar', ''));
        $incluirInactivos = filter_var($request->query('incluir_inactivos', false), FILTER_VALIDATE_BOOLEAN);
        $productos = DB::table('productos')
            ->select('producto_id as id', 'nombre', 'grupo_venta', 'activo')
            ->when(!$incluirInactivos, function ($query) {
                $query->where('activo', 1);
            })
            ->when($termino !== '', function ($query) use ($termino) {
                $query->where('nombre', 'like', '%' . $termino . '%');
            })
            ->orderBy('nombre')
            ->get();

        return response()->json($productos);
    }

    public function productosStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => ['required', 'string', 'max:80'],
            'grupo_venta' => ['required', 'in:HUEVOS,CONGELADO,OTROS'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $nombre = trim($request->input('nombre'));
        $grupoVenta = strtoupper((string) $request->input('grupo_venta'));
        $productoId = DB::table('productos')->insertGetId([
            'nombre' => $nombre,
            'grupo_venta' => $grupoVenta,
            'activo' => 1,
        ]);

        return response()->json([
            'id' => $productoId,
            'nombre' => $nombre,
            'grupo_venta' => $grupoVenta,
            'activo' => 1,
        ], 201);
    }

    public function productosUpdate(Request $request, int $productoId)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => ['required', 'string', 'max:80'],
            'grupo_venta' => ['required', 'in:HUEVOS,CONGELADO,OTROS'],
            'activo' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $producto = DB::table('productos')->where('producto_id', $productoId)->first();
        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $nombre = trim($request->input('nombre'));
        $grupoVenta = strtoupper((string) $request->input('grupo_venta'));
        $activo = $request->has('activo') ? (int) $request->boolean('activo') : (int) $producto->activo;

        DB::table('productos')
            ->where('producto_id', $productoId)
            ->update([
                'nombre' => $nombre,
                'grupo_venta' => $grupoVenta,
                'activo' => $activo,
            ]);

        return response()->json([
            'id' => $productoId,
            'nombre' => $nombre,
            'grupo_venta' => $grupoVenta,
            'activo' => $activo,
        ]);
    }

    public function productosDestroy(Request $request, int $productoId)
    {
        $producto = DB::table('productos')->where('producto_id', $productoId)->first();
        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        DB::table('productos')
            ->where('producto_id', $productoId)
            ->delete();

        return response()->json([
            'id' => $productoId,
            'nombre' => $producto->nombre,
        ]);
    }

    public function lotesStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'producto_id' => ['required', 'integer', 'exists:productos,producto_id'],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'costo_kilo' => ['required', 'numeric', 'min:0'],
            'precio_venta' => ['required', 'numeric', 'min:0'],
            'codigo_comprobante' => ['required', 'string', 'max:50'],
            'fecha_ingreso' => ['required', 'date'],
            'proveedor_id' => ['required', 'integer', 'exists:proveedores,proveedor_id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $usuario = $request->user();
        if (!$usuario) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        $productoId = (int) $request->input('producto_id');
        $cantidad = (float) $request->input('cantidad');
        $costoKilo = (float) $request->input('costo_kilo');
        $precioVenta = (float) $request->input('precio_venta');
        $codigoComprobante = trim((string) $request->input('codigo_comprobante'));
        $fecha = $request->input('fecha_ingreso');
        $proveedorId = (int) $request->input('proveedor_id');

        $producto = DB::table('productos')->where('producto_id', $productoId)->first();
        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $numeroLote = (int) DB::table('compras_lote_detalle')
            ->where('producto_id', $productoId)
            ->count() + 1;

        DB::beginTransaction();
        try {
            $compraLoteId = DB::table('compras_lote')->insertGetId([
                'usuario_id' => $usuario->usuario_id,
                'proveedor_id' => $proveedorId,
                'codigo_comprobante' => $codigoComprobante,
                'fecha_ingreso' => $fecha,
                'estado' => 'ABIERTO',
                'creado_en' => now(),
            ]);

            DB::table('compras_lote_detalle')->insert([
                'compra_lote_id' => $compraLoteId,
                'producto_id' => $productoId,
                'cantidad' => $cantidad,
                'costo_kilo' => $costoKilo,
                'precio_venta' => $precioVenta,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'No se pudo guardar el lote'], 500);
        }

        return response()->json([
            'numero_lote' => $numeroLote,
            'compra_lote_id' => $compraLoteId,
            'fecha_ingreso' => $fecha,
            'producto_id' => $productoId,
            'producto_nombre' => $producto->nombre,
            'cantidad' => $cantidad,
            'costo_kilo' => $costoKilo,
            'precio_venta' => $precioVenta,
            'codigo_comprobante' => $codigoComprobante,
            'creado_en' => now()->toDateTimeString(),
            'estado' => 'ABIERTO',
            'proveedor_id' => $proveedorId,
        ], 201);
    }

    public function lotesUpdate(Request $request, int $compraLoteId)
    {
        $validator = Validator::make($request->all(), [
            'producto_id' => ['required', 'integer', 'exists:productos,producto_id'],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'costo_kilo' => ['required', 'numeric', 'min:0'],
            'precio_venta' => ['required', 'numeric', 'min:0'],
            'codigo_comprobante' => ['required', 'string', 'max:50'],
            'fecha_ingreso' => ['required', 'date'],
            'proveedor_id' => ['required', 'integer', 'exists:proveedores,proveedor_id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $lote = DB::table('compras_lote')->where('compra_lote_id', $compraLoteId)->first();
        if (!$lote) {
            return response()->json(['message' => 'Lote no encontrado'], 404);
        }

        if ($lote->estado === 'CERRADO') {
            return response()->json(['message' => 'El lote está cerrado y no se puede editar'], 409);
        }

        $productoId = (int) $request->input('producto_id');
        $cantidad = (float) $request->input('cantidad');
        $costoKilo = (float) $request->input('costo_kilo');
        $precioVenta = (float) $request->input('precio_venta');
        $codigoComprobante = trim((string) $request->input('codigo_comprobante'));
        $fecha = $request->input('fecha_ingreso');
        $proveedorId = (int) $request->input('proveedor_id');

        $producto = DB::table('productos')->where('producto_id', $productoId)->first();
        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        DB::beginTransaction();
        try {
            DB::table('compras_lote')
                ->where('compra_lote_id', $compraLoteId)
                ->update([
                    'fecha_ingreso' => $fecha,
                    'codigo_comprobante' => $codigoComprobante,
                    'proveedor_id' => $proveedorId,
                ]);

            $detalleActualizado = DB::table('compras_lote_detalle')
                ->where('compra_lote_id', $compraLoteId)
                ->update([
                    'producto_id' => $productoId,
                    'cantidad' => $cantidad,
                    'costo_kilo' => $costoKilo,
                    'precio_venta' => $precioVenta,
                ]);

            if ($detalleActualizado === 0) {
                DB::table('compras_lote_detalle')->insert([
                    'compra_lote_id' => $compraLoteId,
                    'producto_id' => $productoId,
                    'cantidad' => $cantidad,
                    'costo_kilo' => $costoKilo,
                    'precio_venta' => $precioVenta,
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'No se pudo actualizar el lote'], 500);
        }

        $numeroLote = (int) DB::table('compras_lote_detalle')
            ->where('producto_id', $productoId)
            ->count();

        return response()->json([
            'numero_lote' => $numeroLote,
            'compra_lote_id' => $compraLoteId,
            'fecha_ingreso' => $fecha,
            'producto_id' => $productoId,
            'producto_nombre' => $producto->nombre,
            'cantidad' => $cantidad,
            'costo_kilo' => $costoKilo,
            'precio_venta' => $precioVenta,
            'codigo_comprobante' => $codigoComprobante,
            'creado_en' => $lote->creado_en,
            'estado' => $lote->estado,
            'proveedor_id' => $proveedorId,
        ]);
    }

    public function lotesDestroy(Request $request, int $compraLoteId)
    {
        $lote = DB::table('compras_lote')->where('compra_lote_id', $compraLoteId)->first();
        if (!$lote) {
            return response()->json(['message' => 'Lote no encontrado'], 404);
        }

        if ($lote->estado === 'CERRADO') {
            return response()->json(['message' => 'El lote está cerrado y no se puede eliminar'], 409);
        }

        DB::beginTransaction();
        try {
            DB::table('compras_lote_detalle')
                ->where('compra_lote_id', $compraLoteId)
                ->delete();

            DB::table('compras_lote')
                ->where('compra_lote_id', $compraLoteId)
                ->delete();

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'No se pudo eliminar el lote'], 500);
        }

        return response()->json(['message' => 'Lote eliminado']);
    }

    public function ventasDiariasEstado(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fecha' => ['required', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Fecha inválida', 'errors' => $validator->errors()], 422);
        }

        $usuario = $request->user();
        if (!$usuario) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        $fecha = $request->query('fecha');
        $filas = DB::table('otros_productos_ventas_diarias as opvd')
            ->join('productos as p', 'p.producto_id', '=', 'opvd.producto_id')
            ->select([
                'opvd.venta_op_diaria_id',
                'opvd.producto_id',
                'opvd.compra_lote_detalle_id',
                'opvd.cantidad',
                'opvd.precio',
                'opvd.total',
                'opvd.total_huevos',
                'opvd.total_congelados',
                'opvd.fecha_hora',
                'opvd.cerrado_en',
                'p.nombre as producto_nombre',
                'p.grupo_venta',
            ])
            ->where('opvd.usuario_id', $usuario->usuario_id)
            ->whereDate('opvd.fecha_hora', $fecha)
            ->orderBy('opvd.venta_op_diaria_id')
            ->get();

        $cierresHistoricos = DB::table('otros_productos_ventas_diarias as opvd')
            ->join('productos as p', 'p.producto_id', '=', 'opvd.producto_id')
            ->select([
                'opvd.venta_op_diaria_id',
                'opvd.producto_id',
                'opvd.cantidad',
                'opvd.precio',
                'opvd.total',
                'opvd.total_huevos',
                'opvd.total_congelados',
                'opvd.fecha_hora',
                'opvd.cerrado_en',
                'p.nombre as producto_nombre',
                'p.grupo_venta',
            ])
            ->where('opvd.usuario_id', $usuario->usuario_id)
            ->whereNotNull('opvd.cerrado_en')
            ->orderByDesc('opvd.cerrado_en')
            ->orderByDesc('opvd.venta_op_diaria_id')
            ->get()
            ->groupBy(fn ($item) => Carbon::parse($item->fecha_hora)->toDateString())
            ->map(function ($rows, $fechaCierre) {
                $totales = [
                    'huevos' => 0,
                    'congelados' => 0,
                    'general' => 0,
                ];

                $items = [];

                foreach ($rows as $row) {
                    $subtotal = (float) $row->total;
                    $totales['general'] += $subtotal;

                    if ($row->grupo_venta === 'HUEVOS') {
                        $totales['huevos'] += $subtotal;
                    }

                    if ($row->grupo_venta === 'CONGELADO') {
                        $totales['congelados'] += $subtotal;
                    }

                    $items[] = [
                        'venta_op_diaria_id' => $row->venta_op_diaria_id,
                        'producto_id' => $row->producto_id,
                        'producto_nombre' => $row->producto_nombre,
                        'grupo_venta' => $row->grupo_venta,
                        'cantidad' => (float) $row->cantidad,
                        'precio' => (float) $row->precio,
                        'total' => $subtotal,
                    ];
                }

                return [
                    'fecha' => $fechaCierre,
                    'cerrado_en' => optional(collect($rows)->first())->cerrado_en,
                    'total_huevos' => $totales['huevos'],
                    'total_congelados' => $totales['congelados'],
                    'total_general' => $totales['general'],
                    'items' => $items,
                ];
            })
            ->values();

        return response()->json([
            'fecha' => $fecha,
            'cerrado' => $filas->contains(fn ($item) => !is_null($item->cerrado_en)),
            'filas' => $filas,
            'cierres' => $cierresHistoricos,
        ]);
    }

    public function ventasDiariasGuardar(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fecha' => ['required', 'date'],
            'fecha_hora' => ['nullable', 'date'],
            'filas' => ['array'],
            'filas.*.producto_id' => ['required', 'integer', 'exists:productos,producto_id'],
            'filas.*.cantidad' => ['required', 'numeric', 'min:0.01'],
            'filas.*.precio' => ['required', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $usuario = $request->user();
        if (!$usuario) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        $fecha = $request->input('fecha');
        $fechaHora = $request->input('fecha_hora') ?: Carbon::parse($fecha)->format('Y-m-d H:i:s');
        $filas = collect($request->input('filas', []));

        $hayCierre = DB::table('otros_productos_ventas_diarias')
            ->where('usuario_id', $usuario->usuario_id)
            ->whereDate('fecha_hora', $fecha)
            ->whereNotNull('cerrado_en')
            ->exists();

        if ($hayCierre) {
            return response()->json(['message' => 'El día ya está cerrado. Reabre para editar.'], 409);
        }

        $totales = $this->calcularTotalesPorFilas($filas);

        DB::beginTransaction();
        try {
            DB::table('otros_productos_ventas_diarias')
                ->where('usuario_id', $usuario->usuario_id)
                ->whereDate('fecha_hora', $fecha)
                ->whereNull('cerrado_en')
                ->delete();

            foreach ($filas as $fila) {
                DB::table('otros_productos_ventas_diarias')->insert([
                    'usuario_id' => $usuario->usuario_id,
                    'producto_id' => (int) $fila['producto_id'],
                    'compra_lote_detalle_id' => null,
                    'cantidad' => (float) $fila['cantidad'],
                    'precio' => (float) $fila['precio'],
                    'fecha_hora' => $fechaHora,
                    'total' => (float) $fila['cantidad'] * (float) $fila['precio'],
                    'total_huevos' => $totales['huevos'],
                    'total_congelados' => $totales['congelados'],
                    'cerrado_en' => null,
                    'creado_en' => now(),
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'No se pudo guardar el borrador'], 500);
        }

        return response()->json(['message' => 'Borrador guardado']);
    }

    public function ventasDiariasCerrar(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fecha' => ['required', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Fecha inválida', 'errors' => $validator->errors()], 422);
        }

        $usuario = $request->user();
        if (!$usuario) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        $fecha = $request->input('fecha');

        $filas = DB::table('otros_productos_ventas_diarias')
            ->where('usuario_id', $usuario->usuario_id)
            ->whereDate('fecha_hora', $fecha)
            ->whereNull('cerrado_en')
            ->orderBy('venta_op_diaria_id')
            ->get();

        if ($filas->isEmpty()) {
            return response()->json(['message' => 'No hay filas para cerrar en esta fecha'], 422);
        }

        $ahora = now();

        DB::beginTransaction();
        try {
            foreach ($filas as $fila) {
                $detalleLote = DB::table('compras_lote_detalle as cld')
                    ->join('compras_lote as cl', 'cl.compra_lote_id', '=', 'cld.compra_lote_id')
                    ->where('cld.producto_id', $fila->producto_id)
                    ->where('cld.cantidad', '>=', $fila->cantidad)
                    ->where('cl.estado', 'ABIERTO')
                    ->orderBy('cl.fecha_ingreso')
                    ->orderBy('cld.compra_lote_detalle_id')
                    ->lockForUpdate()
                    ->first(['cld.compra_lote_detalle_id', 'cld.cantidad']);

                if (!$detalleLote) {
                    throw new \RuntimeException('Stock insuficiente para cerrar el día.');
                }

                DB::table('compras_lote_detalle')
                    ->where('compra_lote_detalle_id', $detalleLote->compra_lote_detalle_id)
                    ->update([
                        'cantidad' => (float) $detalleLote->cantidad - (float) $fila->cantidad,
                    ]);

                DB::table('otros_productos_ventas_diarias')
                    ->where('venta_op_diaria_id', $fila->venta_op_diaria_id)
                    ->update([
                        'compra_lote_detalle_id' => $detalleLote->compra_lote_detalle_id,
                        'cerrado_en' => $ahora,
                    ]);
            }

            DB::commit();
        } catch (\RuntimeException $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'No se pudo cerrar el día'], 500);
        }

        return response()->json(['message' => 'Día cerrado correctamente']);
    }

    public function ventasDiariasReabrir(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fecha' => ['required', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Fecha inválida', 'errors' => $validator->errors()], 422);
        }

        $usuario = $request->user();
        if (!$usuario) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        $fecha = $request->input('fecha');

        $filas = DB::table('otros_productos_ventas_diarias')
            ->where('usuario_id', $usuario->usuario_id)
            ->whereDate('fecha_hora', $fecha)
            ->whereNotNull('cerrado_en')
            ->get();

        if ($filas->isEmpty()) {
            return response()->json(['message' => 'No hay cierre para reabrir en esta fecha'], 422);
        }

        DB::beginTransaction();
        try {
            foreach ($filas as $fila) {
                if ($fila->compra_lote_detalle_id) {
                    $detalle = DB::table('compras_lote_detalle')
                        ->where('compra_lote_detalle_id', $fila->compra_lote_detalle_id)
                        ->lockForUpdate()
                        ->first();

                    if ($detalle) {
                        DB::table('compras_lote_detalle')
                            ->where('compra_lote_detalle_id', $fila->compra_lote_detalle_id)
                            ->update([
                                'cantidad' => (float) $detalle->cantidad + (float) $fila->cantidad,
                            ]);
                    }
                }
            }

            DB::table('otros_productos_ventas_diarias')
                ->where('usuario_id', $usuario->usuario_id)
                ->whereDate('fecha_hora', $fecha)
                ->update([
                    'cerrado_en' => null,
                    'compra_lote_detalle_id' => null,
                ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'No se pudo reabrir el día'], 500);
        }

        return response()->json(['message' => 'Día reabierto correctamente']);
    }

    private function calcularTotalesPorFilas($filas): array
    {
        $productoIds = collect($filas)->pluck('producto_id')->filter()->values();
        if ($productoIds->isEmpty()) {
            return ['huevos' => 0, 'congelados' => 0];
        }

        $productos = DB::table('productos')
            ->whereIn('producto_id', $productoIds)
            ->pluck('grupo_venta', 'producto_id');

        $huevos = 0;
        $congelados = 0;

        foreach ($filas as $fila) {
            $productoId = (int) ($fila['producto_id'] ?? 0);
            $subtotal = (float) ($fila['cantidad'] ?? 0) * (float) ($fila['precio'] ?? 0);
            $grupo = $productos[$productoId] ?? 'OTROS';

            if ($grupo === 'HUEVOS') {
                $huevos += $subtotal;
            }

            if ($grupo === 'CONGELADO') {
                $congelados += $subtotal;
            }
        }

        return [
            'huevos' => $huevos,
            'congelados' => $congelados,
        ];
    }

}
