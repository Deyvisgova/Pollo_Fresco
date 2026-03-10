<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EntregaProveedor;
use App\Models\PagoProveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PagoProveedorController extends Controller
{
    public function index(Request $request)
    {
        $search = mb_strtolower(trim((string) $request->query('search', '')));

        $query = PagoProveedor::query()->orderByDesc('creado_en')->orderByDesc('pago_id');

        if ($search !== '') {
            $query->where(function ($subquery) use ($search) {
                $subquery
                    ->whereRaw('LOWER(estado) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('CAST(pago_id AS CHAR) LIKE ?', ["%{$search}%"]);
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'usuario_id' => ['required', 'integer', 'exists:usuarios,usuario_id'],
            'entregas_ids' => ['required', 'array', 'min:1'],
            'entregas_ids.*' => ['integer', 'exists:entregas_proveedor,entrega_id'],
            'monto_transferencia' => ['required', 'numeric', 'min:0'],
            'monto_efectivo' => ['required', 'numeric', 'min:0'],
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date'],
        ]);

        return DB::transaction(function () use ($validated) {
            $entregas = EntregaProveedor::whereIn('entrega_id', $validated['entregas_ids'])->lockForUpdate()->get();
            $total = (float) $entregas->sum(fn (EntregaProveedor $entrega) => (float) $entrega->costo_total);
            $pagado = (float) $validated['monto_transferencia'] + (float) $validated['monto_efectivo'];
            $saldo = round($total - $pagado, 2);
            $estado = abs($saldo) < 0.0001 ? 'PAGADO' : 'PENDIENTE';

            $pago = PagoProveedor::create([
                'usuario_id' => $validated['usuario_id'],
                'total' => $total,
                'monto_transferencia' => $validated['monto_transferencia'],
                'monto_efectivo' => $validated['monto_efectivo'],
                'saldo' => $saldo,
                'estado' => $estado,
                'fecha_desde' => $validated['fecha_desde'] ?? null,
                'fecha_hasta' => $validated['fecha_hasta'] ?? null,
                'cantidad_entregas' => $entregas->count(),
            ]);

            if ($estado === 'PAGADO') {
                EntregaProveedor::whereIn('entrega_id', $validated['entregas_ids'])->update(['estado_pago' => 'PAGADO']);
            }

            return response()->json($pago, 201);
        });
    }
}
