<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConfiguracionPolloProveedor extends Model
{
    use HasFactory;

    protected $table = 'configuracion_pollo_proveedor';
    protected $primaryKey = 'configuracion_id';

    protected $fillable = [
        'proveedor_id',
        'merma_factor',
        'precio_kg',
    ];

    protected $casts = [
        'merma_factor' => 'decimal:4',
        'precio_kg' => 'decimal:2',
    ];
}
