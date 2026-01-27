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

@Component({
  selector: 'app-privado-otros-productos-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otros-productos-lotes.html',
  styleUrl: './otros-productos-lotes.css'
})
export class PrivadoOtrosProductosLotes {
  filtro = '';

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
