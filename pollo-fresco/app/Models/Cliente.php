<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    use HasFactory;

    protected $table = 'clientes';
    protected $primaryKey = 'cliente_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public const CREATED_AT = 'creado_en';
    public const UPDATED_AT = 'actualizado_en';

    /**
     * Atributos asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'dni',
        'ruc',
        'nombres',
        'apellidos',
        'celular',
        'direccion',
        'direccion_fiscal',
        'referencias',
    ];

    /**
     * Conversiones de atributos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];
}
