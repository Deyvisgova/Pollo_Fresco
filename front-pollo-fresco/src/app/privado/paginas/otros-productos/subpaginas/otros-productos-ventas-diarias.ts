import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface VentaDiariaItem {
  descripcion: string;
  cantidad: number | null;
  precio: number | null;
}

@Component({
  selector: 'app-privado-otros-productos-ventas-diarias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otros-productos-ventas-diarias.html',
  styleUrl: './otros-productos-ventas-diarias.css'
})
export class PrivadoOtrosProductosVentasDiarias {
  fechaHoy = new Date().toISOString().slice(0, 10);
  tipoSeleccionado: 'CONGELADO' | 'HUEVO' | '' = '';
  cerrado = false;

  ventas: VentaDiariaItem[] = [
    { descripcion: 'Venta 1', cantidad: null, precio: null }
  ];

  get totalDia(): number {
    return this.ventas.reduce((acc, item) => acc + (item.precio ?? 0), 0);
  }

  agregarFila(): void {
    if (this.cerrado) {
      return;
    }
    this.ventas = [
      ...this.ventas,
      { descripcion: `Venta ${this.ventas.length + 1}`, cantidad: null, precio: null }
    ];
  }

  eliminarFila(index: number): void {
    if (this.cerrado) {
      return;
    }
    this.ventas = this.ventas.filter((_, i) => i !== index);
  }

  cerrarDia(): void {
    this.cerrado = true;
  }

  reabrirDia(): void {
    this.cerrado = false;
  }

  limpiar(): void {
    if (this.cerrado) {
      return;
    }
    this.ventas = [{ descripcion: 'Venta 1', cantidad: null, precio: null }];
  }
}
