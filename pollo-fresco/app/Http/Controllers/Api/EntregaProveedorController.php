<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EntregaProveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

class EntregaProveedorController extends Controller
{
    /**
     * Listar entregas de proveedores.
     */
    public function index(Request $request)
    {
        $proveedorId = $request->query('proveedor_id');
        $fechaHora = $request->query('fecha_hora');
        $fechaColumn = $this->fechaColumn();

        $query = EntregaProveedor::with('proveedor')
            ->orderByDesc($fechaColumn)
            ->orderByDesc('entrega_id');

        if ($proveedorId) {
            $query->where('proveedor_id', $proveedorId);
        }

        if ($fechaHora) {
            $query->whereDate($fechaColumn, $fechaHora);
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

        $entrega = EntregaProveedor::create(array_merge([
            'proveedor_id' => $validated['proveedor_id'],
            'usuario_id' => $validated['usuario_id'],
            'cantidad_pollos' => $validated['cantidad_pollos'],
            'peso_total_kg' => $validated['peso_total_kg'],
            'merma_kg' => $validated['merma_kg'],
            'costo_total' => $validated['costo_total'] ?? 0.0,
            'tipo' => $validated['tipo'],
        ], $this->fechaPayload($validated['fecha_hora'])));

        return response()->json($entrega->load('proveedor'), 201);
    }

    /**
     * Actualizar una fila de entrega.
     */
    public function update(Request $request, EntregaProveedor $entregaProveedor)
    {
        $validated = $request->validate([
            'fecha_hora' => ['required', 'date'],
            'cantidad_pollos' => ['required', 'integer', 'min:0'],
            'peso_total_kg' => ['required', 'numeric', 'min:0'],
            'merma_kg' => ['required', 'numeric', 'min:0'],
            'costo_total' => ['required', 'numeric', 'min:0'],
            'tipo' => ['required', 'string', 'max:50'],
        ]);

        $entregaProveedor->update(array_merge([
            'cantidad_pollos' => $validated['cantidad_pollos'],
            'peso_total_kg' => $validated['peso_total_kg'],
            'merma_kg' => $validated['merma_kg'],
            'costo_total' => $validated['costo_total'],
            'tipo' => $validated['tipo'],
        ], $this->fechaPayload($validated['fecha_hora'])));

        return response()->json($entregaProveedor->load('proveedor'));
    }

    /**
     * Eliminar una fila de entrega.
     */
    public function destroy(EntregaProveedor $entregaProveedor)
    {
        $entregaProveedor->delete();

        return response()->json(['message' => 'Entrega eliminada']);
    }

    private function fechaColumn(): string
    {
        return Schema::hasColumn('entregas_proveedor', 'fecha_hora') ? 'fecha_hora' : 'fecha_entrega';
    }

    /**
     * Prepara el campo de fecha según el esquema disponible en BD.
     *
     * @return array<string, mixed>
     */
    private function fechaPayload(string $fechaHora): array
    {
        if (Schema::hasColumn('entregas_proveedor', 'fecha_hora')) {
            return ['fecha_hora' => $fechaHora];
        }

        return ['fecha_entrega' => Carbon::parse($fechaHora)->toDateString()];
    }
}
