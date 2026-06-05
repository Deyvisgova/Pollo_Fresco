<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\PedidoDetalle;
use App\Models\PedidoPago;
use Illuminate\Http\Request;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PedidoDeliveryController extends Controller
{
    /**
     * Lista pedidos delivery con filtros para vendedor o repartidor.
     */
    public function index(Request $request)
    {
        $this->asegurarColumnasPedidos();
        $this->asegurarColumnasClientes();
        $this->asegurarEstadosDelivery();

        $rolVista = $request->query('rol', 'vendedor');
        $usuario = $request->user();

        if ($this->usuarioEsDelivery($usuario)) {
            $rolVista = 'delivery';
        }

        $query = Pedido::query()
            ->with(['cliente', 'detalles', 'pagos', 'delivery:usuario_id,nombres,apellidos', 'vendedor:usuario_id,nombres,apellidos'])
            ->orderByDesc('pedido_id');

        if ($rolVista === 'delivery') {
            $query
                ->where('tipo_pedido', 'DELIVERY')
                ->whereDate('fecha_hora_creacion', now('America/Lima')->toDateString());

            $query->where(function ($subquery) use ($usuario) {
                $subquery
                    ->whereNull('delivery_usuario_id')
                    ->orWhere('delivery_usuario_id', $usuario->id);
            });
        }

        $pedidos = $query->get()->map(fn (Pedido $pedido) => $this->anexarResumenPago($pedido));

        return response()->json($pedidos);
    }

    /**
     * Crea un pedido con estado pendiente por defecto.
     */
    public function store(Request $request)
    {
        $this->asegurarColumnasPedidos();
        $this->asegurarColumnasClientes();
        $this->asegurarEstadosDelivery();

        if ($this->usuarioEsDelivery($request->user())) {
            return response()->json(['message' => 'El rol delivery no puede registrar pedidos.'], 403);
        }

        $payload = $request->validate([
            'cliente_id' => ['nullable', 'integer', 'exists:clientes,cliente_id'],
            'cliente_nuevo' => ['nullable', 'array'],
            'cliente_nuevo.nombres' => ['required_without:cliente_id', 'string', 'max:80'],
            'cliente_nuevo.apellidos' => ['nullable', 'string', 'max:80'],
            'cliente_nuevo.celular' => ['nullable', 'string', 'max:15'],
            'cliente_nuevo.direccion' => ['nullable', 'string', 'max:200'],
            'delivery_usuario_id' => ['nullable', 'integer', 'exists:usuarios,usuario_id'],
            'tipo_pedido' => ['nullable', Rule::in(['MESA', 'DELIVERY'])],
            'mesa' => ['nullable', 'string', 'max:50'],
            'fecha_hora_creacion' => ['required', 'date'],
            'detalles' => ['required', 'array', 'min:1'],
            'detalles.*.cantidad' => ['required', 'numeric', 'min:0.01'],
            'detalles.*.unidad' => ['required', 'string', 'max:11'],
            'detalles.*.descripcion' => ['required', 'string', 'max:120'],
            'detalles.*.precio_unitario' => ['required', 'numeric', 'min:0'],
        ]);

        $pedido = DB::transaction(function () use ($payload, $request) {
            $clienteId = $payload['cliente_id'] ?? null;

            if ($clienteId === null && isset($payload['cliente_nuevo'])) {
                $cliente = Cliente::create([
                    'dni' => null,
                    'ruc' => null,
                    'nombres' => trim((string) ($payload['cliente_nuevo']['nombres'] ?? '')),
                    'apellidos' => trim((string) ($payload['cliente_nuevo']['apellidos'] ?? '')),
                    'nombre_empresa' => null,
                    'celular' => $payload['cliente_nuevo']['celular'] ?? null,
                    'direccion' => $payload['cliente_nuevo']['direccion'] ?? null,
                    'direccion_fiscal' => null,
                    'referencias' => null,
                ]);
                $clienteId = $cliente->cliente_id;
            }

            $pedido = Pedido::create([
                'cliente_id' => $clienteId,
                'vendedor_usuario_id' => $request->user()->id,
                'delivery_usuario_id' => $payload['delivery_usuario_id'] ?? null,
                'estado_id' => 1,
                'tipo_pedido' => $payload['tipo_pedido'] ?? 'DELIVERY',
                'mesa' => trim((string) ($payload['mesa'] ?? '')) ?: null,
                'fecha_hora_creacion' => $payload['fecha_hora_creacion'],
                'total' => 0,
            ]);

            $total = 0;

            foreach ($payload['detalles'] as $detalle) {
                $cantidad = (float) $detalle['cantidad'];
                $precioUnitario = (float) $detalle['precio_unitario'];
                $subtotal = round($cantidad * $precioUnitario, 2);
                $total += $subtotal;

                PedidoDetalle::create([
                    'pedido_id' => $pedido->pedido_id,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal' => $subtotal,
                    'descripcion' => trim((string) $detalle['descripcion']),
                    'unidad' => strtoupper(trim((string) $detalle['unidad'])),
                ]);
            }

            $pedido->total = $total;
            $pedido->save();

            return $pedido;
        });

        return response()->json($this->anexarResumenPago($pedido->load(['cliente', 'detalles', 'pagos'])), 201);
    }

    /**
     * Guarda estado del pedido y control de pagos en una sola operación.
     */
    public function gestionarEstadoPago(Request $request, Pedido $pedido)
    {
        $this->asegurarColumnasPedidos();
        $this->asegurarEstadosDelivery();

        $payload = $request->validate([
            'estado_id' => ['required', Rule::in([1, 2, 3, 4, 5])],
            'motivo_cancelacion' => ['nullable', 'string', 'max:250', 'required_if:estado_id,3,5'],
            'estado_pago' => ['required', Rule::in(['COMPLETO', 'PENDIENTE', 'PARCIAL'])],
            'pago_parcial' => ['nullable', 'numeric', 'min:0'],
            'monto_recibido' => ['nullable', 'numeric', 'min:0'],
        ]);

        if (($payload['estado_pago'] ?? '') === 'PARCIAL' && !isset($payload['pago_parcial'])) {
            return response()->json(['message' => 'Para pago parcial debes indicar el monto pagado.'], 422);
        }

        if ($pedido->delivery_usuario_id !== null && $pedido->delivery_usuario_id !== $request->user()->id) {
            return response()->json(['message' => 'Este pedido no está asignado al delivery autenticado.'], 403);
        }

        DB::transaction(function () use ($pedido, $payload, $request) {
            $pedido->estado_id = (int) $payload['estado_id'];

            if ($pedido->estado_id === 1) {
                $pedido->fecha_hora_entrega = null;
                $pedido->motivo_cancelacion = null;
            }

            if ($pedido->estado_id === 4) {
                $pedido->fecha_hora_entrega = null;
                $pedido->motivo_cancelacion = null;
            }

            if ($pedido->estado_id === 2) {
                $pedido->fecha_hora_entrega = now();
                $pedido->motivo_cancelacion = null;
            }

            if ($pedido->estado_id === 3 || $pedido->estado_id === 5) {
                $pedido->motivo_cancelacion = trim((string) ($payload['motivo_cancelacion'] ?? ''));
                $pedido->fecha_hora_entrega = null;
            }

            $pedido->save();

            if ($pedido->estado_id === 3 || $pedido->estado_id === 5) {
                $tienePedidoId = Schema::hasColumn('otros_productos_ventas_diarias', 'pedido_id');
                $tieneOrigen = Schema::hasColumn('otros_productos_ventas_diarias', 'origen');

                if ($tienePedidoId && $tieneOrigen) {
                    DB::table('otros_productos_ventas_diarias')
                        ->where('usuario_id', $pedido->vendedor_usuario_id)
                        ->where('pedido_id', $pedido->pedido_id)
                        ->where('origen', 'PEDIDO_DELIVERY')
                        ->whereNull('cerrado_en')
                        ->delete();
                }

                return;
            }

            if (($payload['estado_pago'] ?? '') === 'PENDIENTE') {
                return;
            }

            $pagadoAntes = $this->montoPagadoPedido($pedido);
            $saldoAntes = max(0, round((float) $pedido->total - $pagadoAntes, 2));
            $montoRecibido = (float) ($payload['monto_recibido'] ?? 0);
            $montoSolicitado = $payload['estado_pago'] === 'PARCIAL'
                ? (float) ($payload['pago_parcial'] ?? 0)
                : $montoRecibido;
            $pagoAplicado = min($saldoAntes, max(0, $montoSolicitado));
            $pagadoDespues = min((float) $pedido->total, round($pagadoAntes + $pagoAplicado, 2));
            $estadoPago = $payload['estado_pago'] === 'PENDIENTE'
                ? 'PENDIENTE'
                : ($pagadoDespues >= (float) $pedido->total ? 'COMPLETO' : 'PARCIAL');
            $vuelto = $payload['estado_pago'] === 'COMPLETO'
                ? max(0, round($montoRecibido - $saldoAntes, 2))
                : 0;

            PedidoPago::create([
                'pedido_id' => $pedido->pedido_id,
                'registrado_por' => $request->user()->id,
                'fecha_hora' => now(),
                'estado_pago' => $estadoPago,
                'pago_parcial' => $pagoAplicado,
                'vuelto' => $vuelto,
            ]);
        });

        return response()->json($this->anexarResumenPago($pedido->fresh(['cliente', 'detalles', 'pagos'])));
    }

    /**
     * Registra un pago posterior para cuentas pendientes de mesa o delivery.
     */
    public function registrarPago(Request $request, Pedido $pedido)
    {
        $payload = $request->validate([
            'monto' => ['required', 'numeric', 'gt:0'],
        ]);

        if ((int) $pedido->estado_id === 3) {
            return response()->json(['message' => 'No se puede registrar pago en un pedido cancelado.'], 422);
        }

        if ($this->usuarioEsDelivery($request->user()) && $pedido->delivery_usuario_id !== $request->user()->id) {
            return response()->json(['message' => 'Debes tomar este pedido antes de registrar pagos.'], 403);
        }

        DB::transaction(function () use ($pedido, $payload, $request) {
            $pagadoAntes = $this->montoPagadoPedido($pedido);
            $saldoAntes = max(0, round((float) $pedido->total - $pagadoAntes, 2));

            if ($saldoAntes <= 0) {
                return;
            }

            $montoRecibido = (float) $payload['monto'];
            $pagoAplicado = min($saldoAntes, $montoRecibido);
            $pagadoDespues = min((float) $pedido->total, round($pagadoAntes + $pagoAplicado, 2));

            PedidoPago::create([
                'pedido_id' => $pedido->pedido_id,
                'registrado_por' => $request->user()->id,
                'fecha_hora' => now(),
                'estado_pago' => $pagadoDespues >= (float) $pedido->total ? 'COMPLETO' : 'PARCIAL',
                'pago_parcial' => $pagoAplicado,
                'vuelto' => max(0, round($montoRecibido - $saldoAntes, 2)),
            ]);
        });

        return response()->json($this->anexarResumenPago($pedido->fresh(['cliente', 'detalles', 'pagos'])));
    }

    /**
     * Lista solo pedidos con saldo pendiente para la pantalla de cuentas por cobrar.
     */
    public function cuentasPorCobrar()
    {
        $this->asegurarColumnasPedidos();

        if ($this->usuarioEsDelivery(request()->user())) {
            return response()->json(['message' => 'El rol delivery no puede consultar cuentas por cobrar.'], 403);
        }

        $pedidos = Pedido::query()
            ->with(['cliente', 'detalles', 'pagos', 'delivery:usuario_id,nombres,apellidos', 'vendedor:usuario_id,nombres,apellidos'])
            ->where('estado_id', '<>', 3)
            ->orderByDesc('pedido_id')
            ->get()
            ->map(fn (Pedido $pedido) => $this->anexarResumenPago($pedido))
            ->filter(fn (Pedido $pedido) => (float) $pedido->saldo_pendiente > 0)
            ->values();

        return response()->json($pedidos);
    }

    /**
     * Asigna un pedido visible al delivery autenticado.
     */
    public function tomarPedido(Request $request, Pedido $pedido)
    {
        $this->asegurarColumnasPedidos();
        $this->asegurarEstadosDelivery();

        if (!$this->usuarioEsDelivery($request->user())) {
            return response()->json(['message' => 'Solo el rol delivery puede tomar pedidos.'], 403);
        }

        if (($pedido->tipo_pedido ?? 'DELIVERY') !== 'DELIVERY') {
            return response()->json(['message' => 'Solo se pueden tomar pedidos delivery.'], 422);
        }

        if ($pedido->delivery_usuario_id !== null && $pedido->delivery_usuario_id !== $request->user()->id) {
            return response()->json(['message' => 'Este pedido ya fue tomado por otro delivery.'], 409);
        }

        $pedido->delivery_usuario_id = $request->user()->id;
        $pedido->save();

        return response()->json(
            $this->anexarResumenPago($pedido->fresh(['cliente', 'detalles', 'pagos', 'delivery:usuario_id,nombres,apellidos', 'vendedor:usuario_id,nombres,apellidos']))
        );
    }

    /**
     * Guarda coordenadas y evidencia del domicilio para futuros deliveries.
     */
    public function actualizarUbicacionEvidencia(Request $request, Pedido $pedido)
    {
        $this->asegurarColumnasClientes();

        if ($this->usuarioEsDelivery($request->user()) && $pedido->delivery_usuario_id !== $request->user()->id) {
            return response()->json(['message' => 'Debes tomar este pedido antes de editar la ubicacion.'], 403);
        }

        $payload = $request->validate([
            'latitud' => ['nullable', 'numeric', 'between:-90,90'],
            'longitud' => ['nullable', 'numeric', 'between:-180,180'],
            'foto_frontis_url' => ['nullable', 'string', 'max:255'],
            'frontis_foto' => ['nullable', 'file', 'max:4096'],
            'referencias' => ['nullable', 'string', 'max:250'],
        ]);

        if ($request->hasFile('frontis_foto')) {
            $archivo = $request->file('frontis_foto');
            $mimeType = (string) $archivo->getMimeType();

            if (!str_starts_with($mimeType, 'image/')) {
                return response()->json(['message' => 'La foto del frontis debe ser una imagen valida.'], 422);
            }

            $extension = $archivo->getClientOriginalExtension() ?: $archivo->extension() ?: 'jpg';
            $nombreArchivo = 'frontis-' . Str::uuid() . '.' . $extension;
            $rutaPublica = public_path('assets/images/frontis');

            if (!File::exists($rutaPublica)) {
                File::makeDirectory($rutaPublica, 0755, true);
            }

            $archivo->move($rutaPublica, $nombreArchivo);
            $payload['foto_frontis_url'] = $request->getSchemeAndHttpHost() . '/assets/images/frontis/' . $nombreArchivo;
        }

        DB::transaction(function () use ($pedido, $payload, $request) {
            $pedido->fill([
                'latitud' => $payload['latitud'] ?? null,
                'longitud' => $payload['longitud'] ?? null,
                'foto_frontis_url' => $payload['foto_frontis_url'] ?? null,
            ]);
            $pedido->save();

            $cliente = $pedido->cliente;
            if ($cliente) {
                $cliente->fill([
                    'latitud' => $payload['latitud'] ?? null,
                    'longitud' => $payload['longitud'] ?? null,
                    'foto_frontis_url' => $payload['foto_frontis_url'] ?? null,
                    'referencias' => isset($payload['referencias']) ? trim((string) $payload['referencias']) : $cliente->referencias,
                    'ubicacion_actualizada_por' => $request->user()->id,
                    'ubicacion_actualizada_en' => now(),
                ]);
                $cliente->save();
            }
        });

        return response()->json($this->anexarResumenPago($pedido->fresh(['cliente', 'detalles', 'pagos'])));
    }

    private function anexarResumenPago(Pedido $pedido): Pedido
    {
        $total = (float) $pedido->total;
        $pagado = min($total, $this->montoPagadoPedido($pedido));
        $saldo = max(0, round($total - $pagado, 2));

        $pedido->setAttribute('monto_pagado', round($pagado, 2));
        $pedido->setAttribute('saldo_pendiente', $saldo);
        $pedido->setAttribute('estado_pago_calculado', $saldo <= 0 ? 'COMPLETO' : ($pagado > 0 ? 'PARCIAL' : 'PENDIENTE'));

        if ($pedido->relationLoaded('cliente') && $pedido->cliente) {
            $pedido->setAttribute('latitud', $pedido->latitud ?? $pedido->cliente->latitud);
            $pedido->setAttribute('longitud', $pedido->longitud ?? $pedido->cliente->longitud);
            $pedido->setAttribute('foto_frontis_url', $pedido->foto_frontis_url ?? $pedido->cliente->foto_frontis_url);
        }

        return $pedido;
    }

    private function montoPagadoPedido(Pedido $pedido): float
    {
        $pagos = $pedido->relationLoaded('pagos') ? $pedido->pagos : $pedido->pagos()->get();

        return round($pagos
            ->filter(fn (PedidoPago $pago) => $pago->estado_pago !== 'PENDIENTE')
            ->sum(fn (PedidoPago $pago) => (float) ($pago->pago_parcial ?? 0)), 2);
    }

    private function asegurarColumnasPedidos(): void
    {
        if (!Schema::hasTable('pedidos')) {
            return;
        }

        $columnas = [
            'tipo_pedido' => fn (Blueprint $table) => $table->string('tipo_pedido', 20)->default('DELIVERY')->after('estado_id'),
            'mesa' => fn (Blueprint $table) => $table->string('mesa', 50)->nullable()->after('tipo_pedido'),
        ];

        foreach ($columnas as $columna => $callback) {
            if (!Schema::hasColumn('pedidos', $columna)) {
                Schema::table('pedidos', $callback);
            }
        }
    }

    private function asegurarColumnasClientes(): void
    {
        if (!Schema::hasTable('clientes')) {
            return;
        }

        $columnas = [
            'latitud' => fn (Blueprint $table) => $table->decimal('latitud', 10, 7)->nullable()->after('referencias'),
            'longitud' => fn (Blueprint $table) => $table->decimal('longitud', 10, 7)->nullable()->after('latitud'),
            'foto_frontis_url' => fn (Blueprint $table) => $table->string('foto_frontis_url', 255)->nullable()->after('longitud'),
            'ubicacion_actualizada_por' => fn (Blueprint $table) => $table->unsignedInteger('ubicacion_actualizada_por')->nullable()->after('foto_frontis_url'),
            'ubicacion_actualizada_en' => fn (Blueprint $table) => $table->dateTime('ubicacion_actualizada_en')->nullable()->after('ubicacion_actualizada_por'),
        ];

        foreach ($columnas as $columna => $callback) {
            if (!Schema::hasColumn('clientes', $columna)) {
                Schema::table('clientes', $callback);
            }
        }
    }

    private function asegurarEstadosDelivery(): void
    {
        if (!Schema::hasTable('pedido_estados')) {
            return;
        }

        DB::table('pedido_estados')->updateOrInsert(['estado_id' => 4], ['nombre' => 'EN_RUTA']);
        DB::table('pedido_estados')->updateOrInsert(['estado_id' => 5], ['nombre' => 'NO_ENTREGADO']);
    }

    private function usuarioEsDelivery(?object $usuario): bool
    {
        return ($usuario?->role ?? null) === 'delivery' || (int) ($usuario?->rol_id ?? 0) === 3;
    }
}
