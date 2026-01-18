<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoDetalle extends Model
{
    use HasFactory;

    protected $table = 'pedido_detalle';
    protected $primaryKey = 'pedido_detalle_id';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = false;

    /**
     * Atributos asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'pedido_id',
        'producto_id',
        'cantidad',
        'peso_kg',
        'precio_unitario',
        'subtotal',
    ];

    /**
     * Conversiones de atributos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'cantidad' => 'decimal:2',
        'peso_kg' => 'decimal:2',
        'precio_unitario' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    /**
     * Pedido relacionado.
     */
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_id', 'pedido_id');
    }
}
