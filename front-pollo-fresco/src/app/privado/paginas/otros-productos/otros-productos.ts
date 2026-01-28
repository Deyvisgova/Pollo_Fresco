import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privado-otros-productos',
  // Componente informativo para la sección de otros-productos.
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './otros-productos.html',
  styleUrl: './otros-productos.css'
})
export class PrivadoOtrosProductos {}
