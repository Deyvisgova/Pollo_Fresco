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
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id('pedido_id');
            $table->unsignedBigInteger('cliente_id');
            $table->unsignedBigInteger('vendedor_usuario_id');
            $table->unsignedBigInteger('delivery_usuario_id')->nullable();
            $table->unsignedBigInteger('estado_id');
            $table->dateTime('fecha_hora_creacion')->useCurrent();
            $table->dateTime('fecha_hora_entrega')->nullable();
            $table->string('motivo_cancelacion', 250)->nullable();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->string('foto_frontis_url', 255)->nullable();
            $table->decimal('total', 10, 2)->default(0);
        });
    }

    /**
     * Revertir las migraciones.
     */
    public function down(): void
    {
        Schema::dropIfExists('pedidos');
    }
};
