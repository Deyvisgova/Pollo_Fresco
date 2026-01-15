<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['usuario' => 'deyvis'],
            [
                'name' => 'Deyvis',
                'email' => 'deyvisgova@gmail.com',
                'password' => Hash::make('Deyvis260995##'),
                'role' => User::ROLE_ADMIN,
            ]
        );
    }
}
