<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\PedidoDetalle;
use App\Models\PedidoPago;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class PedidoDeliveryController extends Controller
{
    /**
     * Lista pedidos delivery con filtros para vendedor o repartidor.
     */
    public function index(Request $request)
    {
        $rolVista = $request->query('rol', 'vendedor');
        $usuario = $request->user();

        $query = Pedido::query()
            ->with(['cliente', 'detalles', 'pagos', 'delivery:usuario_id,nombres,apellidos', 'vendedor:usuario_id,nombres,apellidos'])
            ->orderByDesc('pedido_id');

        if ($rolVista === 'delivery') {
            $query->where(function ($subquery) use ($usuario) {
                $subquery
                    ->whereNull('delivery_usuario_id')
                    ->orWhere('delivery_usuario_id', $usuario->id);
            });
        }

        return response()->json($query->get());
    }

    /**
     * Crea un pedido con estado pendiente por defecto.
     */
    public function store(Request $request)
    {
        $payload = $request->validate([
            'cliente_id' => ['nullable', 'integer', 'exists:clientes,cliente_id'],
            'cliente_nuevo' => ['nullable', 'array'],
            'cliente_nuevo.nombres' => ['required_without:cliente_id', 'string', 'max:80'],
            'cliente_nuevo.apellidos' => ['nullable', 'string', 'max:80'],
            'cliente_nuevo.celular' => ['nullable', 'string', 'max:15'],
            'cliente_nuevo.direccion' => ['nullable', 'string', 'max:200'],
            'delivery_usuario_id' => ['nullable', 'integer', 'exists:usuarios,usuario_id'],
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

        return response()->json($pedido->load(['cliente', 'detalles', 'pagos']), 201);
    }

    /**
     * Guarda estado del pedido y control de pagos en una sola operación.
     */
    public function gestionarEstadoPago(Request $request, Pedido $pedido)
    {
        $payload = $request->validate([
            'estado_id' => ['required', Rule::in([1, 2, 3])],
            'motivo_cancelacion' => ['nullable', 'string', 'max:250', 'required_if:estado_id,3'],
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

            if ($pedido->estado_id === 2) {
                $pedido->fecha_hora_entrega = now();
                $pedido->motivo_cancelacion = null;
            }

            if ($pedido->estado_id === 3) {
                $pedido->motivo_cancelacion = trim((string) ($payload['motivo_cancelacion'] ?? ''));
                $pedido->fecha_hora_entrega = null;
            }

            $pedido->save();

            if ($pedido->estado_id === 3) {
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

            $montoRecibido = (float) ($payload['monto_recibido'] ?? 0);
            $basePago = $payload['estado_pago'] === 'PARCIAL'
                ? (float) ($payload['pago_parcial'] ?? 0)
                : $montoRecibido;
            $vuelto = max(0, round($montoRecibido - (float) $pedido->total, 2));

            PedidoPago::create([
                'pedido_id' => $pedido->pedido_id,
                'registrado_por' => $request->user()->id,
                'fecha_hora' => now(),
                'estado_pago' => $payload['estado_pago'],
                'pago_parcial' => $basePago,
                'vuelto' => $vuelto,
            ]);
        });

        return response()->json($pedido->fresh(['cliente', 'detalles', 'pagos']));
    }

    /**
     * Guarda coordenadas y evidencia del domicilio para futuros deliveries.
     */
    public function actualizarUbicacionEvidencia(Request $request, Pedido $pedido)
    {
        $payload = $request->validate([
            'latitud' => ['nullable', 'numeric', 'between:-90,90'],
            'longitud' => ['nullable', 'numeric', 'between:-180,180'],
            'foto_frontis_url' => ['nullable', 'string', 'max:255'],
        ]);

        $pedido->fill($payload);
        $pedido->save();

        return response()->json($pedido->fresh(['cliente', 'detalles', 'pagos']));
    }

    /**
     * Sube la evidencia fotográfica del frontis y retorna una URL pública.
     */
    public function subirEvidenciaFrontis(Request $request)
    {
        $validated = $request->validate([
            'foto_frontis' => ['required', 'file', 'max:5120'],
        ]);

        $archivo = $validated['foto_frontis'];
        $mimeType = (string) $archivo->getMimeType();

        if (! str_starts_with($mimeType, 'image/')) {
            return response()->json([
                'message' => 'El archivo debe ser una imagen válida.',
            ], 422);
        }

        $extension = $archivo->getClientOriginalExtension() ?: $archivo->extension() ?: 'jpg';
        $nombreArchivo = 'frontis-' . Str::uuid() . '.' . $extension;

        $rutaPublica = public_path('assets/images/frontis');
        if (! File::exists($rutaPublica)) {
            File::makeDirectory($rutaPublica, 0755, true);
        }

        $archivo->move($rutaPublica, $nombreArchivo);

        // Mantiene copia para desarrollo local del front.
        $rutaFront = base_path('../front-pollo-fresco/src/assets/images');
        if (File::isDirectory(dirname($rutaFront)) || File::isDirectory(base_path('../front-pollo-fresco/src/assets'))) {
            try {
                if (! File::exists($rutaFront)) {
                    File::makeDirectory($rutaFront, 0755, true);
                }

                File::copy(
                    $rutaPublica . DIRECTORY_SEPARATOR . $nombreArchivo,
                    $rutaFront . DIRECTORY_SEPARATOR . $nombreArchivo
                );
            } catch (\Throwable $exception) {
                Log::warning('No se pudo copiar la evidencia de frontis a assets del front.', [
                    'archivo' => $nombreArchivo,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Evidencia subida correctamente.',
            'foto_frontis_url' => asset('assets/images/frontis/' . $nombreArchivo),
        ]);
    }
}
