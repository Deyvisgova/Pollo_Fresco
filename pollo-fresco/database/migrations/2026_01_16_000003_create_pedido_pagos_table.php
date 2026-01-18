<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ejecutar las migraciones.
     */
    public function up(): void
    {
        Schema::create('pedido_pagos', function (Blueprint $table) {
            $table->id('pedido_pago_id');
            $table->unsignedBigInteger('pedido_id');
            $table->unsignedBigInteger('registrado_por');
            $table->dateTime('fecha_hora')->useCurrent();
            $table->enum('estado_pago', ['COMPLETO', 'PENDIENTE', 'PARCIAL']);
            $table->decimal('pago_parcial', 10, 2)->nullable();
            $table->decimal('vuelto', 10, 2)->default(0);
        });
    }

    /**
     * Revertir las migraciones.
     */
    public function down(): void
    {
        Schema::dropIfExists('pedido_pagos');
    }
};
