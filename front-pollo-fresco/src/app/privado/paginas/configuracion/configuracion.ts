import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../servicios/sesion.servicio';

interface ConfiguracionPolloProveedor {
  proveedor_id: number;
  nombres: string;
  apellidos: string | null;
  nombre_empresa: string | null;
  dni: string | null;
  ruc: string | null;
  merma_factor: number;
  precio_kg: number;
}

@Component({
  selector: 'app-privado-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class PrivadoConfiguracion implements OnInit {
  configuraciones: ConfiguracionPolloProveedor[] = [];
  cargando = false;
  guardandoProveedorId: number | null = null;
  error = '';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarConfiguraciones();
  }

  guardar(configuracion: ConfiguracionPolloProveedor): void {
    this.error = '';
    this.guardandoProveedorId = configuracion.proveedor_id;

    const payload = {
      merma_factor: Number(configuracion.merma_factor) || 0,
      precio_kg: Number(configuracion.precio_kg) || 0
    };

    this.http
      .put(`/api/configuracion/pollo/proveedores/${configuracion.proveedor_id}`, payload, {
        headers: this.obtenerHeaders()
      })
      .subscribe({
        next: () => {
          this.guardandoProveedorId = null;
        },
        error: () => {
          this.error = 'No se pudo guardar la configuración del proveedor.';
          this.guardandoProveedorId = null;
        }
      });
  }

  obtenerNombreProveedor(configuracion: ConfiguracionPolloProveedor): string {
    const nombrePersona = [configuracion.nombres, configuracion.apellidos].filter(Boolean).join(' ').trim();
    return nombrePersona || configuracion.nombre_empresa || 'Proveedor sin nombre';
  }

  private cargarConfiguraciones(): void {
    this.cargando = true;
    this.http
      .get<ConfiguracionPolloProveedor[]>('/api/configuracion/pollo/proveedores', {
        headers: this.obtenerHeaders()
      })
      .subscribe({
        next: (data) => {
          this.configuraciones = data;
          this.cargando = false;
        },
        error: () => {
          this.error = 'No se pudo cargar la configuración de pollo por proveedor.';
          this.cargando = false;
        }
      });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    const headersBase = new HttpHeaders({ Accept: 'application/json' });
    return token ? headersBase.set('Authorization', `Bearer ${token}`) : headersBase;
  }
}
