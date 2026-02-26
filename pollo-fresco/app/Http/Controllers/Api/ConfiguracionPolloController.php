<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracionPolloProveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConfiguracionPolloController extends Controller
{
    /**
     * Listar configuración de pollo por proveedor.
     * Incluye proveedores sin configuración para que aparezcan automáticamente.
     */
    public function index()
    {
        $configuraciones = DB::table('proveedores as p')
            ->leftJoin('configuracion_pollo_proveedor as cpp', 'cpp.proveedor_id', '=', 'p.proveedor_id')
            ->select([
                'p.proveedor_id',
                'p.nombres',
                'p.apellidos',
                'p.nombre_empresa',
                'p.dni',
                'p.ruc',
                DB::raw('COALESCE(cpp.merma_factor, 0) as merma_factor'),
                DB::raw('COALESCE(cpp.precio_kg, 0) as precio_kg'),
                'cpp.updated_at as actualizado_en',
            ])
            ->orderBy('p.nombres')
            ->orderBy('p.nombre_empresa')
            ->get();

        return response()->json($configuraciones);
    }

    /**
     * Guardar o actualizar configuración de pollo para un proveedor.
     */
    public function upsert(Request $request, int $proveedorId)
    {
        $validated = $request->validate([
            'merma_factor' => ['required', 'numeric', 'min:0'],
            'precio_kg' => ['required', 'numeric', 'min:0'],
        ]);

        $configuracion = ConfiguracionPolloProveedor::updateOrCreate(
            ['proveedor_id' => $proveedorId],
            [
                'merma_factor' => $validated['merma_factor'],
                'precio_kg' => $validated['precio_kg'],
            ]
        );

        return response()->json($configuracion);
    }
}
