<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoPago extends Model
{
    use HasFactory;

    protected $table = 'pedido_pagos';
    protected $primaryKey = 'pedido_pago_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public const CREATED_AT = 'fecha_hora';
    public const UPDATED_AT = null;

    /**
     * Atributos asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'pedido_id',
        'registrado_por',
        'estado_pago',
        'pago_parcial',
        'vuelto',
    ];

    /**
     * Conversiones de atributos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'fecha_hora' => 'datetime',
        'pago_parcial' => 'decimal:2',
        'vuelto' => 'decimal:2',
    ];

    /**
     * Pedido relacionado.
     */
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_id', 'pedido_id');
    }
}
