<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'usuarios';
    protected $primaryKey = 'usuario_id';
    public $incrementing = true;
    protected $keyType = 'int';

    public const CREATED_AT = 'creado_en';
    public const UPDATED_AT = 'actualizado_en';

    public const ROLE_ADMIN = 'admin';
    public const ROLE_MANAGER = 'manager';
    public const ROLE_CASHIER = 'cashier';

    private const ROLE_ID_MAP = [
        1 => self::ROLE_ADMIN,
        2 => self::ROLE_CASHIER,
        3 => self::ROLE_MANAGER,
    ];

    /**
     * Atributos asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'rol_id',
        'nombres',
        'apellidos',
        'usuario',
        'email',
        'telefono',
        'password_hash',
        'activo',
    ];

    /**
     * Atributos ocultos en la serialización.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password_hash',
    ];

    /**
     * Conversiones de atributos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'activo' => 'boolean',
    ];

    /**
     * Atributos agregados al serializar.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'id',
        'name',
        'role',
    ];

    /**
     * Obtener la lista de roles permitidos en el sistema.
     *
     * @return array<int, string>
     */
    public static function allowedRoles(): array
    {
        return [
            self::ROLE_ADMIN,
            self::ROLE_MANAGER,
            self::ROLE_CASHIER,
        ];
    }

    /**
     * Mapear el rol numérico del sistema al nombre esperado por el frontend.
     */
    public function getRoleAttribute(): string
    {
        return self::ROLE_ID_MAP[$this->rol_id] ?? self::ROLE_CASHIER;
    }

    /**
     * Devolver el id de usuario en el formato esperado por el frontend.
     */
    public function getIdAttribute(): int
    {
        return (int) $this->usuario_id;
    }

    /**
     * Devolver el nombre completo esperado por el frontend.
     */
    public function getNameAttribute(): string
    {
        return trim("{$this->nombres} {$this->apellidos}");
    }

    /**
     * Obtener la contraseña para autenticar contra el hash almacenado.
     */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    /**
     * Obtener el ID numérico del rol a partir del nombre proporcionado.
     */
    public static function roleIdFromName(string $role): int
    {
        return match (strtolower($role)) {
            self::ROLE_ADMIN => 1,
            self::ROLE_MANAGER => 3,
            default => 2,
        };
    }
}
