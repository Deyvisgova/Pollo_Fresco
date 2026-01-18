<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClienteController extends Controller
{
    /**
     * Listar clientes con búsqueda opcional.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        $query = Cliente::query();

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('nombres', 'like', "%{$search}%")
                    ->orWhere('apellidos', 'like', "%{$search}%")
                    ->orWhere('dni', 'like', "%{$search}%")
                    ->orWhere('ruc', 'like', "%{$search}%")
                    ->orWhere('celular', 'like', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderBy('nombres')->get()
        );
    }

    /**
     * Guardar un nuevo cliente.
     */
    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);

        $cliente = Cliente::create($validated);

        return response()->json($cliente, 201);
    }

    /**
     * Actualizar un cliente existente.
     */
    public function update(Request $request, Cliente $cliente)
    {
        $validated = $this->validatePayload($request, $cliente->cliente_id);

        $cliente->fill($validated)->save();

        return response()->json($cliente);
    }

    /**
     * Mostrar un cliente.
     */
    public function show(Cliente $cliente)
    {
        return response()->json($cliente);
    }

    /**
     * Eliminar un cliente.
     */
    public function destroy(Cliente $cliente)
    {
        $cliente->delete();

        return response()->json(['message' => 'Cliente eliminado correctamente.']);
    }

    /**
     * Reglas de validación compartidas.
     */
    private function validatePayload(Request $request, ?int $clienteId = null): array
    {
        return $request->validate([
            'dni' => [
                'nullable',
                'string',
                'size:8',
                Rule::unique('clientes', 'dni')->ignore($clienteId, 'cliente_id'),
            ],
            'ruc' => [
                'nullable',
                'string',
                'size:11',
                Rule::unique('clientes', 'ruc')->ignore($clienteId, 'cliente_id'),
            ],
            'nombres' => ['required', 'string', 'max:80'],
            'apellidos' => ['required', 'string', 'max:80'],
            'celular' => ['nullable', 'string', 'size:9'],
            'direccion' => ['nullable', 'string', 'max:200'],
            'direccion_fiscal' => ['nullable', 'string', 'max:200'],
            'referencias' => ['nullable', 'string', 'max:250'],
        ]);
    }
}
