<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ConfiguracionController extends Controller
{
    /**
     * Sube y guarda el logo del sidebar en la carpeta de assets del front.
     */
    public function subirLogo(Request $request)
    {
        $validated = $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $archivoLogo = $validated['logo'];
        $extension = $archivoLogo->getClientOriginalExtension();
        $nombreArchivo = 'logo-sidebar-' . Str::uuid() . '.' . $extension;

        $rutaLogo = base_path('../front-pollo-fresco/src/assets/images/logo');

        if (! File::exists($rutaLogo)) {
            File::makeDirectory($rutaLogo, 0755, true);
        }

        $archivoLogo->move($rutaLogo, $nombreArchivo);

        return response()->json([
            'message' => 'Logo subido correctamente.',
            'logo_url' => '/assets/images/logo/' . $nombreArchivo,
        ]);
    }
}
