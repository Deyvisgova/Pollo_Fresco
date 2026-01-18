<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PedidoEstado extends Model
{
    use HasFactory;

    protected $table = 'pedido_estados';
    protected $primaryKey = 'estado_id';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = false;

    /**
     * Atributos asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'nombre',
    ];
}
