<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProveedorController extends Controller
{
    /**
     * Listar proveedores, con búsqueda opcional.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        $query = Proveedor::query();

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('nombres', 'like', "%{$search}%")
                    ->orWhere('apellidos', 'like', "%{$search}%")
                    ->orWhere('ruc', 'like', "%{$search}%")
                    ->orWhere('dni', 'like', "%{$search}%")
                    ->orWhere('nombre_empresa', 'like', "%{$search}%")
                    ->orWhere('telefono', 'like', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderBy('nombres')->get()
        );
    }

    /**
     * Guardar un nuevo proveedor.
     */
    public function store(Request $request)
    {
        $validated = $this->normalizarPayload($this->validatePayload($request));

        $proveedor = Proveedor::create($validated);

        return response()->json($proveedor, 201);
    }

    /**
     * Actualizar un proveedor existente.
     */
    public function update(Request $request, Proveedor $proveedor)
    {
        $validated = $this->normalizarPayload($this->validatePayload($request, $proveedor->proveedor_id));

        $proveedor->fill($validated)->save();

        return response()->json($proveedor);
    }

    /**
     * Mostrar un proveedor.
     */
    public function show(Proveedor $proveedor)
    {
        return response()->json($proveedor);
    }

    /**
     * Eliminar un proveedor.
     */
    public function destroy(Proveedor $proveedor)
    {
        $proveedor->delete();

        return response()->json(['message' => 'Proveedor eliminado correctamente.']);
    }

    /**
     * Reglas de validación compartidas.
     */
    private function validatePayload(Request $request, ?int $proveedorId = null): array
    {
        return $request->validate([
            'dni' => [
                'nullable',
                'string',
                'size:8',
                Rule::unique('proveedores', 'dni')->ignore($proveedorId, 'proveedor_id'),
            ],
            'ruc' => [
                'nullable',
                'string',
                'size:11',
                Rule::unique('proveedores', 'ruc')->ignore($proveedorId, 'proveedor_id'),
            ],
            'nombre_empresa' => ['nullable', 'string', 'max:100'],
            'nombres' => ['nullable', 'string', 'max:80'],
            'apellidos' => ['nullable', 'string', 'max:80'],
            'direccion' => ['nullable', 'string', 'max:200'],
            'telefono' => ['nullable', 'string', 'max:9'],
        ]);
    }

    /**
     * Normalizar datos para tablas con columnas NOT NULL.
     */
    private function normalizarPayload(array $payload): array
    {
        $payload['nombres'] = isset($payload['nombres']) ? trim((string) $payload['nombres']) : '';
        $payload['apellidos'] = isset($payload['apellidos']) ? trim((string) $payload['apellidos']) : '';

        return $payload;
    }

}
