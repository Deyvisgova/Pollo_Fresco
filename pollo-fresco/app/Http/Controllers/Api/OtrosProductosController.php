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
            ->select([
                'cl.compra_lote_id',
                'cl.fecha_ingreso',
                'cl.costo_lote',
                'cl.estado',
                'p.producto_id',
                'p.nombre as producto_nombre',
                'cld.cantidad',
                DB::raw('ROW_NUMBER() OVER (PARTITION BY p.producto_id ORDER BY cl.compra_lote_id) as numero_lote'),
            ])
            ->orderByDesc('cl.compra_lote_id')
            ->get();

        return response()->json($lotes);
    }

    public function productosIndex(Request $request)
    {
        $productos = DB::table('productos')
            ->select('producto_id as id', 'nombre')
            ->where('activo', 1)
            ->orderBy('nombre')
            ->get();

        return response()->json($productos);
    }

    public function productosStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => ['required', 'string', 'max:80'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $nombre = trim($request->input('nombre'));
        $productoId = DB::table('productos')->insertGetId([
            'nombre' => $nombre,
            'activo' => 1,
        ]);

        return response()->json([
            'id' => $productoId,
            'nombre' => $nombre,
        ], 201);
    }

    public function lotesStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'producto_id' => ['required', 'integer', 'exists:productos,producto_id'],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'costo_lote' => ['required', 'numeric', 'min:0'],
            'fecha_ingreso' => ['required', 'date'],
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
        $costo = (float) $request->input('costo_lote');
        $fecha = $request->input('fecha_ingreso');

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
                'fecha_ingreso' => $fecha,
                'costo_lote' => $costo,
                'estado' => 'ABIERTO',
                'creado_en' => now(),
            ]);

            DB::table('compras_lote_detalle')->insert([
                'compra_lote_id' => $compraLoteId,
                'producto_id' => $productoId,
                'cantidad' => $cantidad,
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
            'costo_lote' => $costo,
            'estado' => 'ABIERTO',
        ], 201);
    }

    public function lotesUpdate(Request $request, int $compraLoteId)
    {
        $validator = Validator::make($request->all(), [
            'producto_id' => ['required', 'integer', 'exists:productos,producto_id'],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'costo_lote' => ['required', 'numeric', 'min:0'],
            'fecha_ingreso' => ['required', 'date'],
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
        $costo = (float) $request->input('costo_lote');
        $fecha = $request->input('fecha_ingreso');

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
                    'costo_lote' => $costo,
                ]);

            DB::table('compras_lote_detalle')
                ->where('compra_lote_id', $compraLoteId)
                ->delete();

            DB::table('compras_lote_detalle')->insert([
                'compra_lote_id' => $compraLoteId,
                'producto_id' => $productoId,
                'cantidad' => $cantidad,
            ]);

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
            'costo_lote' => $costo,
            'estado' => $lote->estado,
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
}
