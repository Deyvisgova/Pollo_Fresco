<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class VentaController extends Controller
{
    public function index(Request $request)
    {
        $this->asegurarTablasVenta();

        $buscar = trim((string) $request->query('buscar', ''));
        $fechaDesde = trim((string) $request->query('fecha_desde', ''));
        $fechaHasta = trim((string) $request->query('fecha_hasta', ''));

        $query = DB::table('ventas');

        if ($buscar !== '') {
            $query->where(function ($builder) use ($buscar) {
                $builder
                    ->where('serie', 'like', "%{$buscar}%")
                    ->orWhere('numero', 'like', "%{$buscar}%")
                    ->orWhere('tipo_comprobante', 'like', "%{$buscar}%")
                    ->orWhere('cliente_nombre', 'like', "%{$buscar}%")
                    ->orWhere('cliente_documento', 'like', "%{$buscar}%");
            });
        }

        if ($fechaDesde !== '') {
            $query->whereDate('fecha_emision', '>=', $fechaDesde);
        }

        if ($fechaHasta !== '') {
            $query->whereDate('fecha_emision', '<=', $fechaHasta);
        }

        $ventas = $query
            ->orderByDesc('comprobante_venta_id')
            ->limit(200)
            ->get();

        return response()->json($ventas);
    }

    public function store(Request $request)
    {
        $this->asegurarTablasVenta();

        $validator = Validator::make($request->all(), [
            'tipo_comprobante' => ['required', 'string', 'max:20'],
            'serie' => ['required', 'string', 'max:10'],
            'numero' => ['required', 'string', 'max:20'],
            'fecha_emision' => ['required', 'date'],
            'moneda' => ['required', 'string', 'max:10'],
            'forma_pago' => ['required', 'string', 'max:40'],
            'metodo_pago' => ['required', 'string', 'max:30'],
            'cliente_tipo_documento' => ['nullable', 'string', 'max:10'],
            'cliente_documento' => ['nullable', 'string', 'max:20'],
            'cliente_nombre' => ['nullable', 'string', 'max:150'],
            'cliente_direccion' => ['nullable', 'string', 'max:255'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
            'monto_recibido' => ['nullable', 'numeric', 'min:0'],
            'vuelto' => ['nullable', 'numeric', 'min:0'],
            'referencia_serie' => ['nullable', 'string', 'max:10'],
            'referencia_numero' => ['nullable', 'string', 'max:20'],
            'referencia_motivo' => ['nullable', 'string', 'max:255'],
            'detalles' => ['required', 'array', 'min:1'],
            'detalles.*.descripcion' => ['required', 'string', 'max:120'],
            'detalles.*.unidad' => ['required', 'string', 'max:10'],
            'detalles.*.cantidad' => ['required', 'numeric', 'gt:0'],
            'detalles.*.precio_unitario' => ['required', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos inválidos para guardar la venta.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $usuario = $request->user();
        if (!$usuario) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        $detalles = collect($request->input('detalles', []))
            ->map(function (array $detalle) {
                $cantidad = (float) $detalle['cantidad'];
                $precio = (float) $detalle['precio_unitario'];

                return [
                    'descripcion' => trim((string) $detalle['descripcion']),
                    'unidad' => trim((string) $detalle['unidad']),
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precio,
                    'total_linea' => round($cantidad * $precio, 2),
                ];
            })
            ->values();

        DB::beginTransaction();
        try {
            $this->guardarClienteDesdeVenta($request);

            $ventaId = DB::table('ventas')->insertGetId([
                'usuario_id' => $usuario->usuario_id,
                'tipo_comprobante' => $request->input('tipo_comprobante'),
                'serie' => $request->input('serie'),
                'numero' => $request->input('numero'),
                'fecha_emision' => $request->input('fecha_emision'),
                'moneda' => $request->input('moneda'),
                'forma_pago' => $request->input('forma_pago'),
                'metodo_pago' => $request->input('metodo_pago'),
                'cliente_tipo_documento' => $request->input('cliente_tipo_documento'),
                'cliente_documento' => $request->input('cliente_documento'),
                'cliente_nombre' => $request->input('cliente_nombre'),
                'cliente_direccion' => $request->input('cliente_direccion'),
                'subtotal' => (float) $request->input('subtotal'),
                'total' => (float) $request->input('total'),
                'monto_recibido' => $request->input('monto_recibido'),
                'vuelto' => (float) $request->input('vuelto', 0),
                'referencia_serie' => $request->input('referencia_serie'),
                'referencia_numero' => $request->input('referencia_numero'),
                'referencia_motivo' => $request->input('referencia_motivo'),
                'creado_en' => now(),
            ]);

            foreach ($detalles as $detalle) {
                DB::table('venta_detalle')->insert([
                    'comprobante_venta_id' => $ventaId,
                    'descripcion' => $detalle['descripcion'],
                    'unidad' => $detalle['unidad'],
                    'cantidad' => $detalle['cantidad'],
                    'precio_unitario' => $detalle['precio_unitario'],
                    'total_linea' => $detalle['total_linea'],
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'No se pudo guardar la venta.',
                'error' => $e->getMessage(),
            ], 500);
        }

        $venta = DB::table('ventas')->where('comprobante_venta_id', $ventaId)->first();

        return response()->json($venta, 201);
    }

    public function pdf(Request $request, int $ventaId)
    {
        $this->asegurarTablasVenta();

        $formato = (string) $request->query('formato', 'a4');
        if (!in_array($formato, ['a4', 'ticket-80', 'ticket-57'], true)) {
            return response()->json(['message' => 'Formato de comprobante inválido.'], 422);
        }

        [$venta, $detalles] = $this->obtenerVentaConDetalles($ventaId);
        if (!$venta) {
            return response()->json(['message' => 'Venta no encontrada.'], 404);
        }

        $lineas = [
            'POLLO FRESCO S.A.C.',
            strtoupper((string) $venta->tipo_comprobante) . " {$venta->serie}-{$venta->numero}",
            "Fecha: {$venta->fecha_emision}",
            'Cliente: ' . ($venta->cliente_nombre ?: 'Público general'),
            'Documento: ' . ($venta->cliente_documento ?: '-'),
            '----------------------------------------',
        ];

        foreach ($detalles as $detalle) {
            $lineas[] = sprintf('%s x%s %s', $detalle->descripcion, $detalle->cantidad, $detalle->unidad);
            $lineas[] = sprintf('  S/ %.2f', $detalle->total_linea);
        }

        $lineas[] = '----------------------------------------';
        $lineas[] = sprintf('TOTAL: S/ %.2f', $venta->total);
        $lineas[] = 'Gracias por su compra';

        [$ancho, $alto] = match ($formato) {
            'ticket-80' => [226.77, max(320, 40 + (count($lineas) * 14))],
            'ticket-57' => [161.57, max(320, 40 + (count($lineas) * 14))],
            default => [595.28, 841.89],
        };

        $contenido = "BT\n/F1 12 Tf\n14 TL\n20 " . ($alto - 30) . " Td\n";
        foreach ($lineas as $linea) {
            $texto = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $linea);
            $contenido .= "({$texto}) Tj\nT*\n";
        }
        $contenido .= 'ET';

        $pdf = $this->renderSimplePdf($contenido, $ancho, $alto);
        $nombre = "comprobante-{$venta->serie}-{$venta->numero}-{$formato}.pdf";

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$nombre}\"",
        ]);
    }

    public function xml(int $ventaId)
    {
        $this->asegurarTablasVenta();

        [$venta, $detalles] = $this->obtenerVentaConDetalles($ventaId);
        if (!$venta) {
            return response()->json(['message' => 'Venta no encontrada.'], 404);
        }

        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><comprobante></comprobante>');
        $xml->addChild('tipo_comprobante', (string) $venta->tipo_comprobante);
        $xml->addChild('serie', (string) $venta->serie);
        $xml->addChild('numero', (string) $venta->numero);
        $xml->addChild('fecha_emision', (string) $venta->fecha_emision);
        $xml->addChild('moneda', (string) $venta->moneda);
        $xml->addChild('forma_pago', (string) $venta->forma_pago);
        $xml->addChild('metodo_pago', (string) $venta->metodo_pago);

        $cliente = $xml->addChild('cliente');
        $cliente->addChild('tipo_documento', (string) ($venta->cliente_tipo_documento ?? ''));
        $cliente->addChild('documento', (string) ($venta->cliente_documento ?? ''));
        $cliente->addChild('nombre', htmlspecialchars((string) ($venta->cliente_nombre ?? '')));
        $cliente->addChild('direccion', htmlspecialchars((string) ($venta->cliente_direccion ?? '')));

        $items = $xml->addChild('detalles');
        foreach ($detalles as $detalle) {
            $item = $items->addChild('item');
            $item->addChild('descripcion', htmlspecialchars((string) $detalle->descripcion));
            $item->addChild('unidad', (string) $detalle->unidad);
            $item->addChild('cantidad', (string) $detalle->cantidad);
            $item->addChild('precio_unitario', (string) $detalle->precio_unitario);
            $item->addChild('total_linea', (string) $detalle->total_linea);
        }

        $xml->addChild('subtotal', (string) $venta->subtotal);
        $xml->addChild('total', (string) $venta->total);
        $xml->addChild('vuelto', (string) $venta->vuelto);

        $nombre = "comprobante-{$venta->serie}-{$venta->numero}.xml";

        return response($xml->asXML(), 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$nombre}\"",
        ]);
    }

    private function obtenerVentaConDetalles(int $ventaId): array
    {
        $venta = DB::table('ventas')->where('comprobante_venta_id', $ventaId)->first();

        $detalles = DB::table('venta_detalle')
            ->where('comprobante_venta_id', $ventaId)
            ->orderBy('comprobante_venta_detalle_id')
            ->get();

        return [$venta, $detalles];
    }

    private function guardarClienteDesdeVenta(Request $request): void
    {
        if (!Schema::hasTable('clientes')) {
            return;
        }

        $tipoDocumento = trim((string) $request->input('cliente_tipo_documento'));
        $documento = trim((string) $request->input('cliente_documento'));
        $nombre = trim((string) $request->input('cliente_nombre'));

        if ($documento === '' && $nombre === '') {
            return;
        }

        $direccion = trim((string) $request->input('cliente_direccion'));
        [$nombres, $apellidos] = $this->separarNombreCompleto($nombre);

        $payloadBase = [
            'nombres' => $nombres,
            'apellidos' => $apellidos,
            'direccion' => $direccion !== '' ? $direccion : null,
            'direccion_fiscal' => $direccion !== '' ? $direccion : null,
            'actualizado_en' => now(),
        ];

        $columnaDocumento = $tipoDocumento === 'ruc' ? 'ruc' : 'dni';

        if ($documento !== '') {
            $clienteExistente = DB::table('clientes')->where($columnaDocumento, $documento)->first();

            if ($clienteExistente) {
                DB::table('clientes')
                    ->where('cliente_id', $clienteExistente->cliente_id)
                    ->update($payloadBase);

                return;
            }

            DB::table('clientes')->insert(array_merge($payloadBase, [
                'dni' => $columnaDocumento === 'dni' ? $documento : null,
                'ruc' => $columnaDocumento === 'ruc' ? $documento : null,
                'creado_en' => now(),
            ]));

            return;
        }

        DB::table('clientes')->insert(array_merge($payloadBase, [
            'dni' => null,
            'ruc' => null,
            'creado_en' => now(),
        ]));
    }

    private function separarNombreCompleto(string $nombreCompleto): array
    {
        $partes = preg_split('/\s+/', trim($nombreCompleto)) ?: [];
        if (!$partes) {
            return ['Público', 'general'];
        }

        if (count($partes) === 1) {
            return [$partes[0], ''];
        }

        $apellidos = array_pop($partes) ?: '';
        $nombres = implode(' ', $partes);

        return [$nombres !== '' ? $nombres : 'Cliente', $apellidos];
    }

    private function renderSimplePdf(string $content, float $width, float $height): string
    {
        $objects = [];
        $objects[] = '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj';
        $objects[] = '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj';
        $objects[] = sprintf('3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>endobj', $width, $height);
        $objects[] = "4 0 obj<< /Length " . strlen($content) . " >>stream\n{$content}\nendstream\nendobj";
        $objects[] = '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj';

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object . "\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n";
        $pdf .= '0 ' . (count($objects) + 1) . "\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= sprintf('%010d 00000 n ', $offsets[$i]) . "\n";
        }

        $pdf .= 'trailer<< /Size ' . (count($objects) + 1) . ' /Root 1 0 R >>' . "\n";
        $pdf .= "startxref\n";
        $pdf .= $xrefOffset . "\n";
        $pdf .= '%%EOF';

        return $pdf;
    }

    private function asegurarTablasVenta(): void
    {
        if (!Schema::hasTable('ventas')) {
            Schema::create('ventas', function (Blueprint $table) {
                $table->bigIncrements('comprobante_venta_id');
                $table->unsignedBigInteger('usuario_id');
                $table->string('tipo_comprobante', 20);
                $table->string('serie', 10);
                $table->string('numero', 20);
                $table->date('fecha_emision');
                $table->string('moneda', 10)->default('PEN');
                $table->string('forma_pago', 40)->default('Contado');
                $table->string('metodo_pago', 30)->default('efectivo');
                $table->string('cliente_tipo_documento', 10)->nullable();
                $table->string('cliente_documento', 20)->nullable();
                $table->string('cliente_nombre', 150)->nullable();
                $table->string('cliente_direccion', 255)->nullable();
                $table->decimal('subtotal', 12, 2)->default(0);
                $table->decimal('total', 12, 2)->default(0);
                $table->decimal('monto_recibido', 12, 2)->nullable();
                $table->decimal('vuelto', 12, 2)->default(0);
                $table->string('referencia_serie', 10)->nullable();
                $table->string('referencia_numero', 20)->nullable();
                $table->string('referencia_motivo', 255)->nullable();
                $table->timestamp('creado_en')->useCurrent();

                $table->index(['serie', 'numero']);
                $table->index('fecha_emision');
            });
        }

        if (!Schema::hasTable('venta_detalle')) {
            Schema::create('venta_detalle', function (Blueprint $table) {
                $table->bigIncrements('comprobante_venta_detalle_id');
                $table->unsignedBigInteger('comprobante_venta_id');
                $table->string('descripcion', 120);
                $table->string('unidad', 10)->default('UND');
                $table->decimal('cantidad', 12, 2);
                $table->decimal('precio_unitario', 12, 2);
                $table->decimal('total_linea', 12, 2);

                $table->foreign('comprobante_venta_id', 'fk_cvdet_comprobante')
                    ->references('comprobante_venta_id')
                    ->on('ventas')
                    ->cascadeOnDelete();
            });
        }
    }
}
