<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsuariosController extends Controller
{
    /**
     * Mostrar listado de usuarios.
     */
    public function index()
    {
        return User::orderByDesc('usuario_id')->get();
    }

    /**
     * Registrar un nuevo usuario.
     */
    public function store(Request $request)
    {
        $data = $this->validarDatos($request);
        $data['password_hash'] = Hash::make($data['password']);
        unset($data['password']);

        $usuario = User::create($data);

        return response()->json($usuario, 201);
    }

    /**
     * Mostrar un usuario específico.
     */
    public function show(User $usuario)
    {
        return $usuario;
    }

    /**
     * Actualizar un usuario existente.
     */
    public function update(Request $request, User $usuario)
    {
        $data = $this->validarDatos($request, $usuario->usuario_id);
        if (!empty($data['password'])) {
            $usuario->password_hash = Hash::make($data['password']);
        }
        unset($data['password']);

        $usuario->fill($data);
        $usuario->save();

        return $usuario;
    }

    /**
     * Eliminar un usuario.
     */
    public function destroy(User $usuario)
    {
        $usuario->delete();

        return response()->json(['message' => 'Usuario eliminado.']);
    }

    /**
     * Validar datos de usuario.
     */
    private function validarDatos(Request $request, ?int $usuarioId = null): array
    {
        $reglas = [
            'rol_id' => ['required', 'integer', Rule::in([1, 2, 3])],
            'nombres' => ['required', 'string', 'max:80'],
            'apellidos' => ['required', 'string', 'max:80'],
            'usuario' => [
                'required',
                'string',
                'max:60',
                Rule::unique('usuarios', 'usuario')->ignore($usuarioId, 'usuario_id'),
            ],
            'email' => [
                'required',
                'email',
                'max:120',
                Rule::unique('usuarios', 'email')->ignore($usuarioId, 'usuario_id'),
            ],
            'telefono' => ['nullable', 'string', 'max:9'],
            'password' => [
                $usuarioId ? 'nullable' : 'required',
                'string',
                'min:6',
                'confirmed',
                'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/',
            ],
            'activo' => ['required', 'boolean'],
        ];

        return $request->validate($reglas);
    }
}
