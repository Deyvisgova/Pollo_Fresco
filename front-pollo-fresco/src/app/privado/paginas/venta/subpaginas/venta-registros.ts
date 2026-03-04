import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface VentaGuardada {
  comprobante_venta_id: number;
  tipo_comprobante: string;
  serie: string;
  numero: string;
  fecha_emision: string;
  cliente_nombre: string;
  total: number;
  moneda: string;
}

@Component({
  selector: 'app-privado-venta-registros',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './venta-registros.html',
  styleUrl: './venta-registros.css'
})
export class PrivadoVentaRegistros implements OnInit {
  ventasRegistradas: VentaGuardada[] = [];
  cargando = false;
  error = '';
  buscando = '';
  fechaDesde = '';
  fechaHasta = '';
  formatoVoucher: 'a4' | 'ticket-80' | 'ticket-57' = 'a4';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.error = '';
    this.cargando = true;

    let params = new HttpParams();
    if (this.buscando.trim()) {
      params = params.set('buscar', this.buscando.trim());
    }
    if (this.fechaDesde) {
      params = params.set('fecha_desde', this.fechaDesde);
    }
    if (this.fechaHasta) {
      params = params.set('fecha_hasta', this.fechaHasta);
    }

    this.http.get<VentaGuardada[]>('/api/ventas', { headers: this.obtenerHeaders(), params }).subscribe({
      next: (ventas) => {
        this.ventasRegistradas = ventas;
        this.cargando = false;
      },
      error: (err) => {
        this.ventasRegistradas = [];
        this.error = err?.error?.message ?? 'No se pudieron cargar las ventas.';
        this.cargando = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.buscando = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.cargarVentas();
  }

  imprimir(venta: VentaGuardada): void {
    this.obtenerPdfBlob(venta.comprobante_venta_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const ventana = window.open(url, '_blank');
        if (ventana) {
          ventana.onload = () => ventana.print();
        }
      },
      error: () => {
        this.error = 'No se pudo generar el PDF para imprimir.';
      }
    });
  }

  descargar(venta: VentaGuardada): void {
    this.obtenerPdfBlob(venta.comprobante_venta_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante-${venta.serie}-${venta.numero}.pdf`;
        enlace.click();
      },
      error: () => {
        this.error = 'No se pudo descargar el PDF.';
      }
    });
  }

  compartir(venta: VentaGuardada): void {
    this.obtenerPdfBlob(venta.comprobante_venta_id).subscribe({
      next: async (blob) => {
        const archivo = new File([blob], `comprobante-${venta.serie}-${venta.numero}.pdf`, {
          type: 'application/pdf'
        });

        if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
          await navigator.share({
            title: `Comprobante ${venta.serie}-${venta.numero}`,
            text: 'Adjunto el comprobante de venta.',
            files: [archivo]
          });
          return;
        }

        this.error = 'Tu navegador no soporta compartir archivos. Usa descargar.';
      },
      error: () => {
        this.error = 'No se pudo preparar el archivo para compartir.';
      }
    });
  }

  descargarXml(venta: VentaGuardada): void {
    this.http
      .get(`/api/ventas/${venta.comprobante_venta_id}/xml`, {
        headers: this.obtenerHeaders(),
        responseType: 'blob'
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = `comprobante-${venta.serie}-${venta.numero}.xml`;
          enlace.click();
        },
        error: () => {
          this.error = 'No se pudo descargar el XML.';
        }
      });
  }

  private obtenerPdfBlob(ventaId: number) {
    return this.http.get(`/api/ventas/${ventaId}/pdf?formato=${this.formatoVoucher}`, {
      headers: this.obtenerHeaders(),
      responseType: 'blob'
    });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
