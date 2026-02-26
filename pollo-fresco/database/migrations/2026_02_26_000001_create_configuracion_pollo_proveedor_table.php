<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('configuracion_pollo_proveedor', function (Blueprint $table): void {
            $table->bigIncrements('configuracion_id');
            $table->unsignedBigInteger('proveedor_id')->unique();
            $table->decimal('merma_factor', 8, 4)->default(0);
            $table->decimal('precio_kg', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('proveedor_id')
                ->references('proveedor_id')
                ->on('proveedores')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracion_pollo_proveedor');
    }
};
