<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ConfiguracionController extends Controller
{
    /**
     * Sube y guarda el logo del sidebar en una ruta pública servida por Laravel.
     */
    public function subirLogo(Request $request)
    {
        $validated = $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $archivoLogo = $validated['logo'];
        $extension = $archivoLogo->getClientOriginalExtension();
        $nombreArchivo = 'logo-sidebar-' . Str::uuid() . '.' . $extension;

        $rutaLogoPublica = public_path('assets/images/logo');

        if (! File::exists($rutaLogoPublica)) {
            File::makeDirectory($rutaLogoPublica, 0755, true);
        }

        $archivoLogo->move($rutaLogoPublica, $nombreArchivo);

        // Mantiene una copia en assets del front (si existe) para flujos de desarrollo.
        $rutaLogoFront = base_path('../front-pollo-fresco/src/assets/images/logo');
        if (File::isDirectory(dirname($rutaLogoFront)) || File::isDirectory(base_path('../front-pollo-fresco/src/assets/images'))) {
            try {
                if (! File::exists($rutaLogoFront)) {
                    File::makeDirectory($rutaLogoFront, 0755, true);
                }

                File::copy(
                    $rutaLogoPublica . DIRECTORY_SEPARATOR . $nombreArchivo,
                    $rutaLogoFront . DIRECTORY_SEPARATOR . $nombreArchivo
                );
            } catch (\Throwable $exception) {
                Log::warning('No se pudo copiar el logo a assets del front.', [
                    'archivo' => $nombreArchivo,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Logo subido correctamente.',
            'logo_url' => asset('assets/images/logo/' . $nombreArchivo),
        ]);
    }
}
