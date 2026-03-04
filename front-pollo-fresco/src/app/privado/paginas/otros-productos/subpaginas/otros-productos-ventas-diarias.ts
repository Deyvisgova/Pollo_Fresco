import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface VentaDiariaItem {
  descripcion: string;
  cantidad: number | null;
  precio: number | null;
  unidad: 'KG' | 'CASILLERO' | 'UNIDAD';
}

interface LoteApi {
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  costo_lote: number;
}

@Component({
  selector: 'app-privado-otros-productos-ventas-diarias',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './otros-productos-ventas-diarias.html',
  styleUrl: './otros-productos-ventas-diarias.css'
})
export class PrivadoOtrosProductosVentasDiarias implements OnInit {
  fechaHoy = new Date().toISOString().slice(0, 10);
  tipoSeleccionado: 'CONGELADO' | 'HUEVO' | '' = '';
  cerrado = false;
  costoHuevosUnidad = 0;

  /**
   * Este valor sale de los lotes de congelados.
   * Lo usamos para calcular una utilidad estimada por kg vendido.
   */
  costoPromedioCongeladosKg = 0;

  /**
   * Stock disponible en kilos: se calcula sumando la cantidad de lotes de congelados.
   */
  stockCongeladosKg = 0;

  ventas: VentaDiariaItem[] = [
    { descripcion: 'Venta 1', cantidad: null, precio: null, unidad: 'KG' }
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarResumenCongelados();
  }

  get totalDia(): number {
    return this.ventas.reduce((acc, item) => {
      const cantidad = item.cantidad ?? 0;
      const precio = item.precio ?? 0;
      return acc + (cantidad * precio);
    }, 0);
  }

  get costoEstimadoDia(): number {
    if (this.tipoSeleccionado === 'CONGELADO') {
      return this.ventas.reduce((acc, item) => acc + ((item.cantidad ?? 0) * this.costoPromedioCongeladosKg), 0);
    }

    if (this.tipoSeleccionado === 'HUEVO') {
      return this.ventas.reduce((acc, item) => {
        const cantidad = item.cantidad ?? 0;
        const unidades = item.unidad === 'CASILLERO' ? cantidad * 30 : cantidad;
        return acc + (unidades * this.costoHuevosUnidad);
      }, 0);
    }

    return 0;
  }

  get gananciaEstimadaDia(): number {
    return this.totalDia - this.costoEstimadoDia;
  }

  get stockRestanteCongeladosKg(): number {
    if (this.tipoSeleccionado !== 'CONGELADO') {
      return this.stockCongeladosKg;
    }
    const vendidoKg = this.ventas.reduce((acc, item) => acc + (item.cantidad ?? 0), 0);
    return this.stockCongeladosKg - vendidoKg;
  }

  onTipoSeleccionado(): void {
    const unidadInicial = this.tipoSeleccionado === 'HUEVO' ? 'CASILLERO' : 'KG';
    this.ventas = this.ventas.map((venta, index) => ({
      ...venta,
      unidad: unidadInicial,
      descripcion: `Venta ${index + 1}`
    }));
  }

  agregarFila(): void {
    if (this.cerrado) {
      return;
    }

    const unidad = this.tipoSeleccionado === 'HUEVO' ? 'CASILLERO' : 'KG';
    this.ventas = [
      ...this.ventas,
      { descripcion: `Venta ${this.ventas.length + 1}`, cantidad: null, precio: null, unidad }
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
    this.ventas = [{ descripcion: 'Venta 1', cantidad: null, precio: null, unidad: this.tipoSeleccionado === 'HUEVO' ? 'CASILLERO' : 'KG' }];
  }

  private cargarResumenCongelados(): void {
    const headers = this.obtenerHeaders();
    this.http.get<LoteApi[]>('/api/otros-productos/lotes', { headers }).subscribe({
      next: (lotes) => {
        const lotesCongelados = lotes.filter((lote) => !this.esHuevo(lote.producto_nombre));
        const totalKg = lotesCongelados.reduce((acc, lote) => acc + Number(lote.cantidad ?? 0), 0);
        const totalCosto = lotesCongelados.reduce((acc, lote) => acc + Number(lote.costo_lote ?? 0), 0);

        this.stockCongeladosKg = totalKg;
        this.costoPromedioCongeladosKg = totalKg > 0 ? totalCosto / totalKg : 0;
      }
    });
  }

  private esHuevo(nombreProducto: string): boolean {
    return nombreProducto.toLowerCase().includes('huevo');
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
