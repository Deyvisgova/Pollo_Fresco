<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    use HasFactory;

    protected $table = 'pedidos';
    protected $primaryKey = 'pedido_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public const CREATED_AT = 'fecha_hora_creacion';
    public const UPDATED_AT = null;

    /**
     * Atributos asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'cliente_id',
        'vendedor_usuario_id',
        'delivery_usuario_id',
        'estado_id',
        'fecha_hora_entrega',
        'motivo_cancelacion',
        'latitud',
        'longitud',
        'foto_frontis_url',
        'total',
    ];

    /**
     * Conversiones de atributos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'fecha_hora_creacion' => 'datetime',
        'fecha_hora_entrega' => 'datetime',
        'latitud' => 'decimal:7',
        'longitud' => 'decimal:7',
        'total' => 'decimal:2',
    ];

    /**
     * Cliente relacionado.
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id', 'cliente_id');
    }

    /**
     * Vendedor que registró el pedido.
     */
    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendedor_usuario_id', 'usuario_id');
    }

    /**
     * Delivery asignado.
     */
    public function delivery(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivery_usuario_id', 'usuario_id');
    }

    /**
     * Estado del pedido.
     */
    public function estado(): BelongsTo
    {
        return $this->belongsTo(PedidoEstado::class, 'estado_id', 'estado_id');
    }

    /**
     * Detalles del pedido.
     */
    public function detalles(): HasMany
    {
        return $this->hasMany(PedidoDetalle::class, 'pedido_id', 'pedido_id');
    }

    /**
     * Pagos del pedido.
     */
    public function pagos(): HasMany
    {
        return $this->hasMany(PedidoPago::class, 'pedido_id', 'pedido_id');
    }
}
