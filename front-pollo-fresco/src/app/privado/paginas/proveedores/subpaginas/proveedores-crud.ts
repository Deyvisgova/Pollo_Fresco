import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface ProveedorApi {
  proveedor_id: number;
  dni: string | null;
  ruc: string | null;
  nombres: string;
  apellidos: string | null;
  direccion: string | null;
  telefono: string | null;
  creado_en: string;
  actualizado_en: string;
}

interface ProveedorFormulario {
  proveedor_id: number | null;
  dni: string;
  ruc: string;
  nombres: string;
  apellidos: string;
  direccion: string;
  telefono: string;
}

@Component({
  selector: 'app-privado-proveedores-crud',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './proveedores-crud.html',
  styleUrl: './proveedores-crud.css'
})
export class PrivadoProveedoresCrud implements OnInit {
  private token = 'f3ba6fa1f3a2b2d1a6390dc06d831ebad2f218a9d3ba43e7f1f42b425dd03e26';

  consultaDni = '';
  consultaRuc = '';
  consultaResultado: Record<string, unknown> | null = null;
  consultaError = '';
  consultaCargando = false;
  cargando = false;
  guardando = false;

  proveedores: ProveedorApi[] = [];

  formulario: ProveedorFormulario = {
    proveedor_id: null,
    dni: '',
    ruc: '',
    nombres: '',
    apellidos: '',
    direccion: '',
    telefono: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarProveedores();
  }

  consultarDni(): void {
    this.consultaError = '';
    this.consultaResultado = null;

    if (!this.consultaDni.trim()) {
      this.consultaError = 'Ingresa el DNI para consultar.';
      return;
    }

    if (this.consultaDni.length !== 8) {
      this.consultaError = 'El DNI debe tener 8 dígitos.';
      return;
    }

    const url = `https://apiperu.dev/api/dni/${this.consultaDni}?api_token=${this.token}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        this.consultaResultado = datos;
        this.autocompletarDesdeDni(datos);
      },
      error: () => {
        this.consultaError = 'No pudimos conectar con la SUNAT/RENIEC. Revisa el número e intenta nuevamente.';
        this.consultaCargando = false;
      },
      complete: () => {
        this.consultaCargando = false;
      }
    });
  }

  consultarRuc(): void {
    this.consultaError = '';
    this.consultaResultado = null;

    if (!this.consultaRuc.trim()) {
      this.consultaError = 'Ingresa el RUC para consultar.';
      return;
    }

    if (this.consultaRuc.length !== 11) {
      this.consultaError = 'El RUC debe tener 11 dígitos.';
      return;
    }

    const url = `https://apiperu.dev/api/ruc/${this.consultaRuc}?api_token=${this.token}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        this.consultaResultado = datos;
        this.autocompletarDesdeRuc(datos);
      },
      error: () => {
        this.consultaError = 'No pudimos conectar con la SUNAT/RENIEC. Revisa el número e intenta nuevamente.';
        this.consultaCargando = false;
      },
      complete: () => {
        this.consultaCargando = false;
      }
    });
  }

  guardarProveedor(): void {
    if (!this.formulario.nombres.trim()) {
      this.consultaError = 'Completa al menos el nombre o razón social del proveedor.';
      return;
    }

    this.guardando = true;
    this.consultaError = '';

    const payload = {
      dni: this.formulario.dni || null,
      ruc: this.formulario.ruc || null,
      nombres: this.formulario.nombres,
      apellidos: this.formulario.apellidos || null,
      direccion: this.formulario.direccion || null,
      telefono: this.formulario.telefono || null
    };

    const headers = this.obtenerHeaders();
    const request = this.formulario.proveedor_id
      ? this.http.put<ProveedorApi>(
          `/api/proveedores/${this.formulario.proveedor_id}`,
          payload,
          { headers }
        )
      : this.http.post<ProveedorApi>('/api/proveedores', payload, { headers });

    request.subscribe({
      next: () => {
        this.cargarProveedores();
        this.limpiarFormulario();
      },
      error: () => {
        this.consultaError = 'No se pudo guardar el proveedor. Revisa los datos e intenta nuevamente.';
      },
      complete: () => {
        this.guardando = false;
      }
    });
  }

  editarProveedor(proveedor: ProveedorApi): void {
    this.formulario = {
      proveedor_id: proveedor.proveedor_id,
      dni: proveedor.dni ?? '',
      ruc: proveedor.ruc ?? '',
      nombres: proveedor.nombres,
      apellidos: proveedor.apellidos ?? '',
      direccion: proveedor.direccion ?? '',
      telefono: proveedor.telefono ?? ''
    };
  }

  eliminarProveedor(proveedor: ProveedorApi): void {
    const headers = this.obtenerHeaders();
    this.http.delete(`/api/proveedores/${proveedor.proveedor_id}`, { headers }).subscribe({
      next: () => this.cargarProveedores(),
      error: () => {
        this.consultaError = 'No se pudo eliminar el proveedor.';
      }
    });
  }

  limpiarFormulario(): void {
    this.formulario = {
      proveedor_id: null,
      dni: '',
      ruc: '',
      nombres: '',
      apellidos: '',
      direccion: '',
      telefono: ''
    };
  }

  private autocompletarDesdeDni(datos: Record<string, unknown>): void {
    const apellidoPaterno = (datos['apellido_paterno'] as string) ?? '';
    const apellidoMaterno = (datos['apellido_materno'] as string) ?? '';
    const nombres = (datos['nombres'] as string) ?? (datos['nombre'] as string) ?? '';

    this.formulario = {
      ...this.formulario,
      dni: ((datos['numero'] as string) ?? this.consultaDni).toString(),
      nombres: nombres || (datos['nombre_completo'] as string) || this.formulario.nombres,
      apellidos:
        `${apellidoPaterno} ${apellidoMaterno}`.trim() ||
        (datos['apellido'] as string) ||
        this.formulario.apellidos
    };
  }

  private autocompletarDesdeRuc(datos: Record<string, unknown>): void {
    this.formulario = {
      ...this.formulario,
      ruc: ((datos['numero'] as string) ?? this.consultaRuc).toString(),
      nombres:
        (datos['nombre_o_razon_social'] as string) ??
        (datos['razon_social'] as string) ??
        (datos['nombre_comercial'] as string) ??
        this.formulario.nombres,
      direccion: (datos['direccion'] as string) ?? this.formulario.direccion
    };
  }

  private cargarProveedores(): void {
    this.cargando = true;
    const headers = this.obtenerHeaders();
    this.http.get<ProveedorApi[]>('/api/proveedores', { headers }).subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores;
      },
      error: () => {
        this.consultaError = 'No se pudo cargar la lista de proveedores.';
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
