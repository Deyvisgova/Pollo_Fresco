<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class VentaController extends Controller
{
    public function index()
    {
        $ventas = DB::table('comprobantes_venta')
            ->orderByDesc('comprobante_venta_id')
            ->limit(100)
            ->get();

        return response()->json($ventas);
    }

    public function store(Request $request)
    {
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
            $ventaId = DB::table('comprobantes_venta')->insertGetId([
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
                DB::table('comprobantes_venta_detalle')->insert([
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
            return response()->json(['message' => 'No se pudo guardar la venta.'], 500);
        }

        $venta = DB::table('comprobantes_venta')->where('comprobante_venta_id', $ventaId)->first();

        return response()->json($venta, 201);
    }

    public function pdf(Request $request, int $ventaId)
    {
        $formato = (string) $request->query('formato', 'a4');
        if (!in_array($formato, ['a4', 'ticket-80', 'ticket-57'], true)) {
            return response()->json(['message' => 'Formato de comprobante no válido.'], 422);
        }

        $venta = DB::table('comprobantes_venta')->where('comprobante_venta_id', $ventaId)->first();
        if (!$venta) {
            return response()->json(['message' => 'Venta no encontrada.'], 404);
        }

        $detalles = DB::table('comprobantes_venta_detalle')
            ->where('comprobante_venta_id', $ventaId)
            ->orderBy('comprobante_venta_detalle_id')
            ->get();

        $lineas = [
            'POLLO FRESCO S.A.C.',
            strtoupper((string) $venta->tipo_comprobante) . " {$venta->serie}-{$venta->numero}",
            "Fecha: {$venta->fecha_emision}",
            "Cliente: " . ($venta->cliente_nombre ?: 'Público general'),
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
        $contenido .= "ET";

        $pdf = $this->renderSimplePdf($contenido, $ancho, $alto);
        $nombre = "comprobante-{$venta->serie}-{$venta->numero}-{$formato}.pdf";

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$nombre}\"",
        ]);
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
        $pdf .= 'xref' . "\n";
        $pdf .= '0 ' . (count($objects) + 1) . "\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= sprintf('%010d 00000 n ', $offsets[$i]) . "\n";
        }

        $pdf .= 'trailer<< /Size ' . (count($objects) + 1) . ' /Root 1 0 R >>' . "\n";
        $pdf .= 'startxref' . "\n";
        $pdf .= $xrefOffset . "\n";
        $pdf .= '%%EOF';

        return $pdf;
    }
}
