import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privado-proveedores',
  // Componente informativo para la sección de proveedores.
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css'
})
export class PrivadoProveedores {}
