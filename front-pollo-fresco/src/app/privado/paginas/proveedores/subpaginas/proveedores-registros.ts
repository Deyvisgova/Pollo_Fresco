import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface RegistroEntrega {
  proveedor: string;
  fechaEntrega: string;
  cantidadPollos: number | null;
  pesoTotalKg: number | null;
  mermaKg: number | null;
  costoTotal: number | null;
  observacion: string;
}

@Component({
  selector: 'app-privado-proveedores-registros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proveedores-registros.html',
  styleUrl: './proveedores-registros.css'
})
export class PrivadoProveedoresRegistros {
  registros: RegistroEntrega[] = [
    {
      proveedor: 'Avícola San Juan',
      fechaEntrega: '2024-08-15',
      cantidadPollos: 120,
      pesoTotalKg: 210,
      mermaKg: 2,
      costoTotal: 1650,
      observacion: 'Entrega programada semanal.'
    }
  ];

  formulario: RegistroEntrega = {
    proveedor: '',
    fechaEntrega: '',
    cantidadPollos: null,
    pesoTotalKg: null,
    mermaKg: null,
    costoTotal: null,
    observacion: ''
  };

  indiceEdicion: number | null = null;

  guardarRegistro(): void {
    if (!this.formulario.proveedor.trim()) {
      return;
    }

    if (this.indiceEdicion === null) {
      this.registros = [...this.registros, { ...this.formulario }];
    } else {
      this.registros = this.registros.map((registro, indice) =>
        indice === this.indiceEdicion ? { ...this.formulario } : registro
      );
    }

    this.limpiarFormulario();
  }

  editarRegistro(indice: number): void {
    this.indiceEdicion = indice;
    this.formulario = { ...this.registros[indice] };
  }

  eliminarRegistro(indice: number): void {
    this.registros = this.registros.filter((_, posicion) => posicion !== indice);
    if (this.indiceEdicion === indice) {
      this.limpiarFormulario();
    }
  }

  limpiarFormulario(): void {
    this.indiceEdicion = null;
    this.formulario = {
      proveedor: '',
      fechaEntrega: '',
      cantidadPollos: null,
      pesoTotalKg: null,
      mermaKg: null,
      costoTotal: null,
      observacion: ''
    };
  }
}
