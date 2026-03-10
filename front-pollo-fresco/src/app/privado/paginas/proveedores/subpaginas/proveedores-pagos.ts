import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface PagoDetalleProveedor {
  detalle_id: number;
  entrega_id: number;
  monto_entrega: number;
  estado_pago_anterior: string;
  estado_pago_nuevo: string;
  entrega?: {
    fecha_hora: string;
    proveedor?: {
      nombres: string;
      apellidos: string | null;
    };
  };
}

interface PagoProveedor {
  pago_id: number;
  total: number;
  monto_transferencia: number;
  monto_efectivo: number;
  saldo: number;
  estado: string;
  cantidad_entregas: number;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  creado_en: string;
  detalles?: PagoDetalleProveedor[];
}

@Component({
  selector: 'app-privado-proveedores-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './proveedores-pagos.html',
  styleUrl: './proveedores-pagos.css'
})
export class PrivadoProveedoresPagos implements OnInit {
  busqueda = '';
  pagos: PagoProveedor[] = [];
  cargando = false;
  error = '';

  constructor(private readonly http: HttpClient, private readonly sesionServicio: SesionServicio) {}

  ngOnInit(): void {
    this.cargarPagos();
  }

  cargarPagos(): void {
    this.cargando = true;
    this.error = '';
    const headers = this.obtenerHeaders();
    const query = this.busqueda.trim();
    const params = query ? `?search=${encodeURIComponent(query)}` : '';

    this.http.get<PagoProveedor[]>(`/api/pagos-proveedor${params}`, { headers }).subscribe({
      next: (pagos) => {
        this.pagos = pagos;
      },
      error: () => {
        this.error = 'No se pudo cargar el historial de pagos.';
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  resumenDetalle(pago: PagoProveedor): string {
    if (!pago.detalles || pago.detalles.length === 0) {
      return '-';
    }

    return pago.detalles
      .map((detalle) => {
        const proveedor = detalle.entrega?.proveedor;
        const nombreProveedor = proveedor ? `${proveedor.nombres} ${proveedor.apellidos ?? ''}`.trim() : 'Sin proveedor';
        return `#${detalle.entrega_id} (${nombreProveedor})`;
      })
      .join(', ');
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
