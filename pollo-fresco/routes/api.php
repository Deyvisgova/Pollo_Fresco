<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EntregaProveedorController;
use App\Http\Controllers\Api\ProveedorController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas API
|--------------------------------------------------------------------------
|
| Aquí puedes registrar las rutas API de la aplicación. Estas rutas se
| cargan mediante el RouteServiceProvider y se asignan al middleware "api".
|
*/

/*
|--------------------------------------------------------------------------
| Endpoints de Autenticación
|--------------------------------------------------------------------------
| Estas rutas gestionan registro, inicio de sesión, recuperación de
| contraseñas y manejo de tokens usando Sanctum y el broker de contraseñas.
*/
Route::prefix('auth')->group(function () {
    // Endpoints públicos para registro e inicio de sesión.
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Endpoints públicos para recuperación de contraseña.
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    // Endpoints protegidos que requieren token válido.
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

/*
|--------------------------------------------------------------------------
| Endpoint de Usuario Autenticado
|--------------------------------------------------------------------------
| Esta ruta se conserva por compatibilidad y devuelve el usuario autenticado.
*/
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

/*
|--------------------------------------------------------------------------
| Endpoints de Proveedores
|--------------------------------------------------------------------------
| CRUD de proveedores y registro de entregas de pollos.
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('proveedores', ProveedorController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::get('entregas-proveedor', [EntregaProveedorController::class, 'index']);
    Route::post('entregas-proveedor', [EntregaProveedorController::class, 'store']);
});
