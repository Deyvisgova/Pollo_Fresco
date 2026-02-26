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
     * Registrar una entrega. Si existe misma fecha y proveedor, se incrementa.
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
            'observacion' => ['nullable', 'string', 'max:250'],
        ]);

        $costoTotal = $validated['costo_total'] ?? null;

        if ($costoTotal === null && isset($validated['precio_kg'])) {
            $pesoTotal = (float) $validated['peso_total_kg'];
            $merma = (float) $validated['merma_kg'];
            $precioKg = (float) $validated['precio_kg'];
            $kgConMerma = $pesoTotal + ($pesoTotal * $merma);
            $costoTotal = round($kgConMerma * $precioKg, 2);
        }

        $costoTotal = $costoTotal ?? 0.0;

        $entrega = EntregaProveedor::where('proveedor_id', $validated['proveedor_id'])
            ->where('fecha_hora', $validated['fecha_hora'])
            ->first();

        if ($entrega) {
            $entrega->fill([
                'usuario_id' => $validated['usuario_id'],
                'cantidad_pollos' => $entrega->cantidad_pollos + $validated['cantidad_pollos'],
                'peso_total_kg' => $entrega->peso_total_kg + $validated['peso_total_kg'],
                'merma_kg' => $entrega->merma_kg + $validated['merma_kg'],
                'costo_total' => $entrega->costo_total + $costoTotal,
                'observacion' => $this->mergeObservaciones($entrega->observacion, $validated['observacion'] ?? null),
            ])->save();

            return response()->json($entrega->load('proveedor'));
        }

        $entrega = EntregaProveedor::create([
            'proveedor_id' => $validated['proveedor_id'],
            'usuario_id' => $validated['usuario_id'],
            'fecha_hora' => $validated['fecha_hora'],
            'cantidad_pollos' => $validated['cantidad_pollos'],
            'peso_total_kg' => $validated['peso_total_kg'],
            'merma_kg' => $validated['merma_kg'],
            'costo_total' => $costoTotal,
            'observacion' => $validated['observacion'] ?? null,
        ]);

        return response()->json($entrega->load('proveedor'), 201);
    }

    /**
     * Combinar observaciones en una sola cadena.
     */
    private function mergeObservaciones(?string $actual, ?string $nueva): ?string
    {
        $actual = trim((string) $actual);
        $nueva = trim((string) $nueva);

        if ($actual === '' && $nueva === '') {
            return null;
        }

        if ($actual === '') {
            return $nueva;
        }

        if ($nueva === '') {
            return $actual;
        }

        return "{$actual} | {$nueva}";
    }
}
