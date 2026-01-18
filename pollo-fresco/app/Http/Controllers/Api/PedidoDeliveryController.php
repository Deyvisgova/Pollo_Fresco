<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pedido;
use App\Models\PedidoEstado;
use App\Models\PedidoPago;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PedidoDeliveryController extends Controller
{
    /**
     * Listar pedidos delivery con filtros opcionales.
     */
    public function index(Request $request)
    {
        $query = Pedido::with(['cliente', 'estado', 'detalles', 'pagos', 'vendedor', 'delivery'])
            ->orderByDesc('fecha_hora_creacion')
            ->orderByDesc('pedido_id');

        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->query('cliente_id'));
        }

        if ($request->filled('vendedor_usuario_id')) {
            $query->where('vendedor_usuario_id', $request->query('vendedor_usuario_id'));
        }

        if ($request->filled('delivery_usuario_id')) {
            $query->where('delivery_usuario_id', $request->query('delivery_usuario_id'));
        }

        if ($request->filled('estado_id')) {
            $query->where('estado_id', $request->query('estado_id'));
        }

        if ($request->filled('estado')) {
            $estadoNombre = strtoupper((string) $request->query('estado'));
            $estadoId = $this->getEstadoId($estadoNombre);
            $query->where('estado_id', $estadoId);
        }

        return response()->json($query->get());
    }

    /**
     * Registrar un pedido delivery.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'cliente_id' => ['required', 'integer', 'exists:clientes,cliente_id'],
            'vendedor_usuario_id' => ['required', 'integer', 'exists:usuarios,usuario_id'],
            'delivery_usuario_id' => ['nullable', 'integer', 'exists:usuarios,usuario_id'],
            'latitud' => ['nullable', 'numeric'],
            'longitud' => ['nullable', 'numeric'],
            'foto_frontis_url' => ['nullable', 'string', 'max:255'],
            'detalles' => ['required', 'array', 'min:1'],
            'detalles.*.producto_id' => ['required', 'integer'],
            'detalles.*.cantidad' => ['nullable', 'numeric', 'min:0'],
            'detalles.*.peso_kg' => ['required', 'numeric', 'min:0'],
            'detalles.*.precio_unitario' => ['required', 'numeric', 'min:0'],
            'pago' => ['nullable', 'array'],
            'pago.registrado_por' => ['required_with:pago', 'integer', 'exists:usuarios,usuario_id'],
            'pago.estado_pago' => ['required_with:pago', Rule::in(['COMPLETO', 'PENDIENTE', 'PARCIAL'])],
            'pago.pago_parcial' => ['nullable', 'numeric', 'min:0'],
            'pago.vuelto' => ['nullable', 'numeric', 'min:0'],
        ]);

        $estadoPendienteId = $this->getEstadoId('PENDIENTE');

        $pedido = Pedido::create([
            'cliente_id' => $validated['cliente_id'],
            'vendedor_usuario_id' => $validated['vendedor_usuario_id'],
            'delivery_usuario_id' => $validated['delivery_usuario_id'] ?? null,
            'estado_id' => $estadoPendienteId,
            'latitud' => $validated['latitud'] ?? null,
            'longitud' => $validated['longitud'] ?? null,
            'foto_frontis_url' => $validated['foto_frontis_url'] ?? null,
            'total' => 0,
        ]);

        $detalles = [];
        $total = 0.0;

        foreach ($validated['detalles'] as $detalle) {
            $peso = (float) $detalle['peso_kg'];
            $precio = (float) $detalle['precio_unitario'];
            $subtotal = round($peso * $precio, 2);

            $detalles[] = [
                'producto_id' => $detalle['producto_id'],
                'cantidad' => $detalle['cantidad'] ?? 1,
                'peso_kg' => $peso,
                'precio_unitario' => $precio,
                'subtotal' => $subtotal,
            ];

            $total += $subtotal;
        }

        $pedido->detalles()->createMany($detalles);
        $pedido->fill(['total' => $total])->save();

        if (!empty($validated['pago'])) {
            $this->registrarPago($pedido, $validated['pago']);
        }

        return response()->json($pedido->load(['cliente', 'estado', 'detalles', 'pagos', 'vendedor', 'delivery']), 201);
    }

    /**
     * Mostrar un pedido delivery.
     */
    public function show(Pedido $pedido)
    {
        return response()->json($pedido->load(['cliente', 'estado', 'detalles', 'pagos', 'vendedor', 'delivery']));
    }

    /**
     * Actualizar estado, ubicación o pagos de un pedido.
     */
    public function update(Request $request, Pedido $pedido)
    {
        $estadoCanceladoId = $this->getEstadoId('CANCELADO');

        $validated = $request->validate([
            'delivery_usuario_id' => ['nullable', 'integer', 'exists:usuarios,usuario_id'],
            'estado_id' => ['nullable', 'integer', 'exists:pedido_estados,estado_id'],
            'motivo_cancelacion' => [
                Rule::requiredIf(fn () => (int) $request->input('estado_id') === $estadoCanceladoId),
                'nullable',
                'string',
                'max:250',
            ],
            'fecha_hora_entrega' => ['nullable', 'date'],
            'latitud' => ['nullable', 'numeric'],
            'longitud' => ['nullable', 'numeric'],
            'foto_frontis_url' => ['nullable', 'string', 'max:255'],
            'pago' => ['nullable', 'array'],
            'pago.registrado_por' => ['required_with:pago', 'integer', 'exists:usuarios,usuario_id'],
            'pago.estado_pago' => ['required_with:pago', Rule::in(['COMPLETO', 'PENDIENTE', 'PARCIAL'])],
            'pago.pago_parcial' => ['nullable', 'numeric', 'min:0'],
            'pago.vuelto' => ['nullable', 'numeric', 'min:0'],
        ]);

        $pedido->fill([
            'delivery_usuario_id' => $validated['delivery_usuario_id'] ?? $pedido->delivery_usuario_id,
            'estado_id' => $validated['estado_id'] ?? $pedido->estado_id,
            'motivo_cancelacion' => $validated['motivo_cancelacion'] ?? $pedido->motivo_cancelacion,
            'fecha_hora_entrega' => $validated['fecha_hora_entrega'] ?? $pedido->fecha_hora_entrega,
            'latitud' => $validated['latitud'] ?? $pedido->latitud,
            'longitud' => $validated['longitud'] ?? $pedido->longitud,
            'foto_frontis_url' => $validated['foto_frontis_url'] ?? $pedido->foto_frontis_url,
        ]);

        if (isset($validated['estado_id']) && (int) $validated['estado_id'] !== $estadoCanceladoId) {
            $pedido->motivo_cancelacion = null;
        }

        if (isset($validated['estado_id']) && (int) $validated['estado_id'] === $this->getEstadoId('ENTREGADO')) {
            $pedido->fecha_hora_entrega = $pedido->fecha_hora_entrega ?? now();
        }

        $pedido->save();

        if (!empty($validated['pago'])) {
            $this->registrarPago($pedido, $validated['pago']);
        }

        return response()->json($pedido->load(['cliente', 'estado', 'detalles', 'pagos', 'vendedor', 'delivery']));
    }

    /**
     * Obtener ID de estado por nombre.
     */
    private function getEstadoId(string $nombre): int
    {
        $estado = PedidoEstado::where('nombre', strtoupper($nombre))->first();

        return $estado?->estado_id ?? 1;
    }

    /**
     * Registrar un pago para el pedido.
     */
    private function registrarPago(Pedido $pedido, array $pago): PedidoPago
    {
        return $pedido->pagos()->create([
            'registrado_por' => $pago['registrado_por'],
            'estado_pago' => $pago['estado_pago'],
            'pago_parcial' => $pago['pago_parcial'] ?? null,
            'vuelto' => $pago['vuelto'] ?? 0,
        ]);
    }
}
