<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class EntregaProveedor extends Model
{
    use HasFactory;

    protected $table = 'entregas_proveedor';
    protected $primaryKey = 'entrega_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public const CREATED_AT = 'creado_en';
    public const UPDATED_AT = null;

    /**
     * Atributos asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'proveedor_id',
        'usuario_id',
        'fecha_hora',
        'fecha_entrega',
        'cantidad_pollos',
        'peso_total_kg',
        'merma_kg',
        'costo_total',
        'tipo',
    ];

    /**
     * Conversiones de atributos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'fecha_hora' => 'datetime',
        'fecha_entrega' => 'date',
        'cantidad_pollos' => 'integer',
        'peso_total_kg' => 'decimal:2',
        'merma_kg' => 'decimal:2',
        'costo_total' => 'decimal:2',
        'creado_en' => 'datetime',
    ];

    protected $appends = [
        'fecha_hora',
    ];

    /**
     * Relación con proveedor.
     */
    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id', 'proveedor_id');
    }

    /**
     * Compatibilidad entre esquemas antiguos (fecha_entrega) y nuevos (fecha_hora).
     */
    public function getFechaHoraAttribute(): ?string
    {
        if (isset($this->attributes['fecha_hora'])) {
            return $this->attributes['fecha_hora'];
        }

        if (isset($this->attributes['fecha_entrega'])) {
            return Carbon::parse($this->attributes['fecha_entrega'])->startOfDay()->toDateTimeString();
        }

        return null;
    }
}
