<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ejecutar las migraciones.
     */
    public function up(): void
    {
        Schema::create('pedido_estados', function (Blueprint $table) {
            $table->id('estado_id');
            $table->string('nombre', 20);
        });

        DB::table('pedido_estados')->insert([
            ['estado_id' => 1, 'nombre' => 'PENDIENTE'],
            ['estado_id' => 2, 'nombre' => 'ENTREGADO'],
            ['estado_id' => 3, 'nombre' => 'CANCELADO'],
        ]);
    }

    /**
     * Revertir las migraciones.
     */
    public function down(): void
    {
        Schema::dropIfExists('pedido_estados');
    }
};
