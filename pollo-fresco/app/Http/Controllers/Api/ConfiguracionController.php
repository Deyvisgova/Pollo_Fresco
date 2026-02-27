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
            'logo' => ['required', 'file', 'max:2048'],
        ]);

        $archivoLogo = $validated['logo'];
        $mimeType = (string) $archivoLogo->getMimeType();

        if (! str_starts_with($mimeType, 'image/')) {
            return response()->json([
                'message' => 'El archivo debe ser una imagen válida.',
            ], 422);
        }

        $extension = $archivoLogo->getClientOriginalExtension() ?: $archivoLogo->extension() ?: 'img';
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

    /**
     * Elimina el logo anterior del servidor cuando se solicita desde configuración.
     */
    public function eliminarLogo(Request $request)
    {
        $validated = $request->validate([
            'logo_url' => ['nullable', 'string'],
        ]);

        $logoUrl = trim((string) ($validated['logo_url'] ?? ''));

        if ($logoUrl === '') {
            return response()->json([
                'message' => 'No había logo para eliminar.',
            ]);
        }

        $nombreArchivo = basename(parse_url($logoUrl, PHP_URL_PATH) ?: '');
        if ($nombreArchivo === '' || $nombreArchivo === '.' || $nombreArchivo === '..') {
            return response()->json([
                'message' => 'El logo indicado no es válido.',
            ], 422);
        }

        $rutaLogoPublica = public_path('assets/images/logo/' . $nombreArchivo);
        if (File::exists($rutaLogoPublica)) {
            File::delete($rutaLogoPublica);
        }

        $rutaLogoFront = base_path('../front-pollo-fresco/src/assets/images/logo/' . $nombreArchivo);
        if (File::exists($rutaLogoFront)) {
            File::delete($rutaLogoFront);
        }

        return response()->json([
            'message' => 'Logo eliminado correctamente.',
        ]);
    }
}
