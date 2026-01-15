<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Registrar un usuario nuevo y emitir un token de API.
     */
    public function register(Request $request)
    {
        // Validar datos de registro y limitar los roles permitidos.
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'nombres' => ['nullable', 'string', 'max:255'],
            'apellidos' => ['nullable', 'string', 'max:255'],
            'usuario' => ['required', 'string', 'max:255', 'unique:usuarios,usuario'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:usuarios,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(User::allowedRoles())],
        ]);

        $nombres = $validated['nombres'] ?? null;
        $apellidos = $validated['apellidos'] ?? null;

        if (! $nombres) {
            $nameParts = preg_split('/\s+/', trim((string) ($validated['name'] ?? '')), 2);
            $nombres = $nameParts[0] ?? 'Usuario';
            $apellidos = $apellidos ?? ($nameParts[1] ?? '');
        }

        // Crear el usuario con contraseña cifrada.
        $user = User::create([
            'nombres' => $nombres,
            'apellidos' => $apellidos ?? '',
            'usuario' => $validated['usuario'],
            'email' => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'rol_id' => User::roleIdFromName($validated['role']),
        ]);

        // Emitir un token de Sanctum para autenticación API.
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Usuario registrado correctamente.',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Autenticar un usuario y emitir un nuevo token de API.
     */
    public function login(Request $request)
    {
        // Validar credenciales de acceso.
        $validated = $request->validate([
            'usuario' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // Buscar el usuario y verificar la contraseña.
        $user = User::where('usuario', $validated['usuario'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'Credenciales inválidas.',
            ], 422);
        }

        $storedPassword = $user->getAuthPassword();
        $passwordMatches = Hash::check($validated['password'], $storedPassword);
        $passwordEsPlano = hash_equals($validated['password'], $storedPassword);

        if (! $passwordMatches && ! $passwordEsPlano) {
            return response()->json([
                'message' => 'Credenciales inválidas.',
            ], 422);
        }

        if ($passwordEsPlano) {
            $user->forceFill([
                'password_hash' => Hash::make($validated['password']),
            ])->save();
        }

        // Emitir un nuevo token para la sesión.
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Inicio de sesión exitoso.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Devolver el perfil del usuario autenticado.
     */
    public function me(Request $request)
    {
        // Devolver el usuario autenticado actual.
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    /**
     * Revocar el token de API actual.
     */
    public function logout(Request $request)
    {
        // Revocar únicamente el token de acceso actual.
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * Enviar el enlace de restablecimiento al correo del usuario.
     */
    public function forgotPassword(Request $request)
    {
        // Validar el correo para recuperación de contraseña.
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        // Enviar el correo de restablecimiento con Laravel.
        $status = Password::sendResetLink($validated);

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 422);
    }

    /**
     * Restablecer la contraseña con el token de recuperación.
     */
    public function resetPassword(Request $request)
    {
        // Validar datos del restablecimiento.
        $validated = $request->validate([
            'token' => ['required'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        // Ejecutar el restablecimiento con el broker de Laravel.
        $status = Password::reset(
            $validated,
            function (User $user, string $password) {
                // Actualizar la contraseña y el remember token.
                $user->forceFill([
                    'password_hash' => Hash::make($password),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 422);
    }
}
