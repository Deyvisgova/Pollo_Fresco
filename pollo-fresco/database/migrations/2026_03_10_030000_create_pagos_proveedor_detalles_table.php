<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('pagos_proveedor_detalles')) {
            return;
        }

        Schema::create('pagos_proveedor_detalles', function (Blueprint $table) {
            $table->bigIncrements('detalle_id');
            $table->unsignedBigInteger('pago_id');
            $table->unsignedBigInteger('entrega_id');
            $table->decimal('monto_entrega', 12, 2);
            $table->string('estado_pago_anterior', 20)->default('PENDIENTE');
            $table->string('estado_pago_nuevo', 20)->default('PAGADO');
            $table->timestamp('creado_en')->useCurrent();

            $table->foreign('pago_id')->references('pago_id')->on('pagos_proveedor')->onDelete('cascade');
            $table->foreign('entrega_id')->references('entrega_id')->on('entregas_proveedor')->onDelete('cascade');
            $table->unique(['pago_id', 'entrega_id']);
            $table->index('entrega_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos_proveedor_detalles');
    }
};
