import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
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
  imports: [CommonModule, HttpClientModule],
  templateUrl: './venta-registros.html',
  styleUrl: './venta-registros.css'
})
export class PrivadoVentaRegistros implements OnInit {
  ventasRegistradas: VentaGuardada[] = [];
  cargando = false;
  error = '';

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

    this.http.get<VentaGuardada[]>('/api/ventas', { headers: this.obtenerHeaders() }).subscribe({
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

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
