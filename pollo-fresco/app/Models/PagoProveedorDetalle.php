<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PagoProveedorDetalle extends Model
{
    use HasFactory;

    protected $table = 'pagos_proveedor_detalles';
    protected $primaryKey = 'detalle_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public const CREATED_AT = 'creado_en';
    public const UPDATED_AT = null;

    protected $fillable = [
        'pago_id',
        'entrega_id',
        'monto_entrega',
        'estado_pago_anterior',
        'estado_pago_nuevo',
    ];

    protected $casts = [
        'monto_entrega' => 'decimal:2',
        'creado_en' => 'datetime',
    ];

    public function pago(): BelongsTo
    {
        return $this->belongsTo(PagoProveedor::class, 'pago_id', 'pago_id');
    }

    public function entrega(): BelongsTo
    {
        return $this->belongsTo(EntregaProveedor::class, 'entrega_id', 'entrega_id');
    }
}
