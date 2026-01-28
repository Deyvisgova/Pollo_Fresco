import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface LoteRegistro {
  id: string;
  tipo: 'CONGELADO' | 'HUEVO';
  producto: string;
  cantidad: string;
  precioUnitario: number;
  subtotal: number;
  estado: 'ABIERTO' | 'CERRADO';
}

interface LoteFormItem {
  producto: string;
  cantidad: string;
  precioUnitario: number | null;
}

interface LoteForm {
  id: string;
  fechaIngreso: string;
  costoLote: number | null;
  items: LoteFormItem[];
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
  filtro = '';
  nuevoProducto = '';
  productosSugeridos = ['Huevos', 'Pavita', 'Mondonguito', 'Mollejas'];

  loteForm: LoteForm = {
    id: '',
    fechaIngreso: new Date().toISOString().slice(0, 10),
    costoLote: null,
    items: [{ producto: '', cantidad: '', precioUnitario: null }]
  };

  lotes: LoteRegistro[] = [
    {
      id: 'L-0001',
      tipo: 'CONGELADO',
      producto: 'Pavita',
      cantidad: '12 kg',
      precioUnitario: 14.5,
      subtotal: 174.0,
      estado: 'ABIERTO'
    },
    {
      id: 'L-0001',
      tipo: 'CONGELADO',
      producto: 'Mollejitas',
      cantidad: '8 bolsas',
      precioUnitario: 9.5,
      subtotal: 76.0,
      estado: 'ABIERTO'
    },
    {
      id: 'L-0002',
      tipo: 'HUEVO',
      producto: 'Bandeja 30u',
      cantidad: '6 bandejas',
      precioUnitario: 16.0,
      subtotal: 96.0,
      estado: 'CERRADO'
    }
  ];

  get lotesFiltrados(): LoteRegistro[] {
    const valor = this.filtro.trim().toLowerCase();
    if (!valor) {
      return this.lotes;
    }

    return this.lotes.filter((lote) =>
      [lote.id, lote.tipo, lote.producto, lote.estado].some((campo) =>
        campo.toLowerCase().includes(valor)
      )
    );
  }

  abrirModal(): void {
    this.mostrarModal = true;
    this.loteForm = {
      id: `L-${Date.now().toString().slice(-4)}`,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      costoLote: null,
      items: [{ producto: '', cantidad: '', precioUnitario: null }]
    };
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  agregarFilaProducto(): void {
    this.loteForm.items = [
      ...this.loteForm.items,
      { producto: '', cantidad: '', precioUnitario: null }
    ];
  }

  quitarFilaProducto(index: number): void {
    this.loteForm.items = this.loteForm.items.filter((_, i) => i !== index);
  }

  agregarProductoSugerido(): void {
    const nombre = this.nuevoProducto.trim();
    if (!nombre || this.productosSugeridos.includes(nombre)) {
      return;
    }
    this.productosSugeridos = [...this.productosSugeridos, nombre];
    this.nuevoProducto = '';
  }

  guardarLote(): void {
    const nuevosRegistros: LoteRegistro[] = this.loteForm.items
      .filter((item) => item.producto.trim())
      .map((item) => {
        const cantidadNumero = Number(item.cantidad.replace(',', '.')) || 0;
        const precio = item.precioUnitario ?? 0;
        const tipo = item.producto.toLowerCase().includes('huevo')
          ? 'HUEVO'
          : 'CONGELADO';

        return {
          id: this.loteForm.id,
          tipo,
          producto: item.producto,
          cantidad: item.cantidad || '0',
          precioUnitario: precio,
          subtotal: cantidadNumero * precio,
          estado: 'ABIERTO'
        };
      });

    if (nuevosRegistros.length > 0) {
      this.lotes = [...nuevosRegistros, ...this.lotes];
    }

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
