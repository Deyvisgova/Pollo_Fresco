import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface PagoProveedor {
  pago_id: number;
  total: number;
  monto_transferencia: number;
  monto_efectivo: number;
  saldo: number;
  estado: string;
  cantidad_entregas: number;
  proveedor_pagado: string | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  creado_en: string;
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


  formatearRangoFechas(fechaDesde: string | null, fechaHasta: string | null): string {
    if (!fechaDesde && !fechaHasta) {
      return '-';
    }

    const desde = this.formatearFechaCorta(fechaDesde);
    const hasta = this.formatearFechaCorta(fechaHasta);

    if (desde && hasta) {
      return `${desde} a ${hasta}`;
    }

    return desde || hasta || '-';
  }

  estadoEsPagado(estado: string): boolean {
    return String(estado ?? '').trim().toUpperCase() === 'PAGADO';
  }

  private formatearFechaCorta(fecha: string | null): string {
    if (!fecha) {
      return '';
    }

    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(valor);
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
