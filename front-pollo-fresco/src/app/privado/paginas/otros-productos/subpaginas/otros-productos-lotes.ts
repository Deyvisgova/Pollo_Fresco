import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface LoteRegistro {
  id: number;
  tipo: 'CONGELADO' | 'HUEVO';
  productoId: number;
  productoNombre: string;
  cantidad: number;
  subtotal: number;
  estado: 'ABIERTO' | 'CERRADO';
}

interface Producto {
  id: number;
  nombre: string;
}

interface LoteForm {
  id: number;
  fechaIngreso: string;
  costoLote: number | null;
  productoId: number | null;
  cantidad: number | null;
}

@Component({
  selector: 'app-privado-otros-productos-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otros-productos-lotes.html',
  styleUrl: './otros-productos-lotes.css'
})
export class PrivadoOtrosProductosLotes {
  mostrarModal = false;
  mostrarModalProducto = false;
  filtro = '';
  nuevoProducto = '';
  productoNombreInput = '';
  productos: Producto[] = [
    { id: 1, nombre: 'Huevos' },
    { id: 2, nombre: 'Pavita' },
    { id: 3, nombre: 'Mondonguito' },
    { id: 4, nombre: 'Mollejas' }
  ];

  loteForm: LoteForm = {
    id: 0,
    fechaIngreso: new Date().toISOString().slice(0, 10),
    costoLote: null,
    productoId: null,
    cantidad: null
  };

  lotes: LoteRegistro[] = [
    {
      id: 1,
      tipo: 'CONGELADO',
      productoId: 2,
      productoNombre: 'Pavita',
      cantidad: 12,
      subtotal: 174.0,
      estado: 'ABIERTO'
    },
    {
      id: 1,
      tipo: 'CONGELADO',
      productoId: 4,
      productoNombre: 'Mollejas',
      cantidad: 8,
      subtotal: 76.0,
      estado: 'ABIERTO'
    },
    {
      id: 2,
      tipo: 'HUEVO',
      productoId: 1,
      productoNombre: 'Huevos',
      cantidad: 6,
      subtotal: 96.0,
      estado: 'CERRADO'
    }
  ];

  get lotesFiltrados(): LoteRegistro[] {
    const valor = this.filtro.trim().toLowerCase();
    if (!valor) {
      return this.lotes;
    }

    return this.lotes.filter((lote) => {
      return (
        lote.id.toString().includes(valor) ||
        lote.tipo.toLowerCase().includes(valor) ||
        lote.productoNombre.toLowerCase().includes(valor) ||
        lote.estado.toLowerCase().includes(valor)
      );
    });
  }

  abrirModal(): void {
    this.mostrarModal = true;
    this.productoNombreInput = '';
    this.loteForm = {
      id: 0,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      costoLote: null,
      productoId: null,
      cantidad: null
    };
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  abrirModalProducto(): void {
    this.mostrarModalProducto = true;
    this.nuevoProducto = '';
  }

  cerrarModalProducto(): void {
    this.mostrarModalProducto = false;
  }

  guardarProducto(): void {
    const nombre = this.nuevoProducto.trim();
    if (!nombre) {
      return;
    }

    const nuevoId = Math.max(0, ...this.productos.map((p) => p.id)) + 1;
    const producto = { id: nuevoId, nombre };
    this.productos = [...this.productos, producto];
    this.loteForm.productoId = producto.id;
    this.productoNombreInput = producto.nombre;
    this.cerrarModalProducto();
  }

  siguienteNumeroLote(productoId: number): number {
    const conteo = this.lotes.filter((lote) => lote.productoId === productoId).length;
    return conteo + 1;
  }

  seleccionarProducto(nombre: string): void {
    this.productoNombreInput = nombre;
    const producto = this.productos.find((item) => item.nombre === nombre);
    this.loteForm.productoId = producto ? producto.id : null;
  }

  obtenerNombreProducto(): string {
    if (this.loteForm.productoId) {
      return this.productos.find((item) => item.id === this.loteForm.productoId)?.nombre ?? '';
    }
    return this.productoNombreInput;
  }

  guardarLote(): void {
    if (!this.loteForm.productoId || !this.loteForm.cantidad) {
      return;
    }

    const producto = this.productos.find((item) => item.id === this.loteForm.productoId);
    if (!producto) {
      return;
    }

    const costo = this.loteForm.costoLote ?? 0;
    const numeroLote = this.siguienteNumeroLote(producto.id);
    const tipo = producto.nombre.toLowerCase().includes('huevo') ? 'HUEVO' : 'CONGELADO';

    const nuevoRegistro: LoteRegistro = {
      id: numeroLote,
      tipo,
      productoId: producto.id,
      productoNombre: producto.nombre,
      cantidad: this.loteForm.cantidad,
      subtotal: costo,
      estado: 'ABIERTO'
    };

    this.lotes = [nuevoRegistro, ...this.lotes];

    this.cerrarModal();
  }

  editarLote(lote: LoteRegistro): void {
    if (lote.estado === 'CERRADO') {
      return;
    }

    // Placeholder para edición.
  }

  eliminarLote(lote: LoteRegistro): void {
    if (lote.estado === 'CERRADO') {
      return;
    }

    this.lotes = this.lotes.filter((item) => item !== lote);
  }
}
