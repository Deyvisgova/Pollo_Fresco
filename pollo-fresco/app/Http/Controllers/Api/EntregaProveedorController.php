<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EntregaProveedor;
use Illuminate\Http\Request;

class EntregaProveedorController extends Controller
{
    /**
     * Listar entregas de proveedores.
     */
    public function index(Request $request)
    {
        $proveedorId = $request->query('proveedor_id');
        $fechaHora = $request->query('fecha_hora');

        $query = EntregaProveedor::with('proveedor')
            ->orderByDesc('fecha_hora')
            ->orderByDesc('entrega_id');

        if ($proveedorId) {
            $query->where('proveedor_id', $proveedorId);
        }

        if ($fechaHora) {
            $query->whereDate('fecha_hora', $fechaHora);
        }

        return response()->json($query->get());
    }

    /**
     * Registrar una entrega por línea.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'proveedor_id' => ['required', 'integer', 'exists:proveedores,proveedor_id'],
            'usuario_id' => ['required', 'integer', 'exists:usuarios,usuario_id'],
            'fecha_hora' => ['required', 'date'],
            'cantidad_pollos' => ['required', 'integer', 'min:0'],
            'peso_total_kg' => ['required', 'numeric', 'min:0'],
            'merma_kg' => ['required', 'numeric', 'min:0'],
            'costo_total' => ['nullable', 'numeric', 'min:0'],
            'precio_kg' => ['nullable', 'numeric', 'min:0'],
            'tipo' => ['required', 'string', 'max:50'],
        ]);

        $costoTotal = $validated['costo_total'] ?? null;

        if ($costoTotal === null && isset($validated['precio_kg'])) {
            $pesoTotal = (float) $validated['peso_total_kg'];
            $merma = (float) $validated['merma_kg'];
            $precioKg = (float) $validated['precio_kg'];
            $kgConMerma = $pesoTotal + $merma;
            $costoTotal = round($kgConMerma * $precioKg, 2);
        }

        $entrega = EntregaProveedor::create([
            'proveedor_id' => $validated['proveedor_id'],
            'usuario_id' => $validated['usuario_id'],
            'fecha_hora' => $validated['fecha_hora'],
            'cantidad_pollos' => $validated['cantidad_pollos'],
            'peso_total_kg' => $validated['peso_total_kg'],
            'merma_kg' => $validated['merma_kg'],
            'costo_total' => $costoTotal ?? 0.0,
            'tipo' => $validated['tipo'],
        ]);

        return response()->json($entrega->load('proveedor'), 201);
    }
}
