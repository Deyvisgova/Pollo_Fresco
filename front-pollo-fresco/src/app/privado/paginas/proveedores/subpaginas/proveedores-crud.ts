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
  nombre_empresa: string | null;
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
  nombreEmpresa: string;
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

  consultaDocumento = '';
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
    nombreEmpresa: '',
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

  consultarDocumentoApi(): void {
    this.consultaError = '';
    this.consultaResultado = null;

    const documento = this.consultaDocumento.trim();

    if (!documento) {
      this.consultaError = 'Ingresa el DNI o RUC para consultar.';
      return;
    }

    if (!/^\d+$/.test(documento)) {
      this.consultaError = 'El documento solo debe contener dígitos.';
      return;
    }

    if (documento.length === 8) {
      this.consultarApi(`dni/${documento}`, this.autocompletarDesdeDni.bind(this));
      return;
    }

    if (documento.length === 11) {
      this.consultarApi(`ruc/${documento}`, this.autocompletarDesdeRuc.bind(this));
      return;
    }

    this.consultaError = 'El documento debe tener 8 dígitos (DNI) o 11 dígitos (RUC).';
  }

  guardarProveedor(): void {
    if (!this.formulario.nombres.trim() && !this.formulario.nombreEmpresa.trim()) {
      this.consultaError = 'Completa al menos el nombre o el nombre de la empresa del proveedor.';
      return;
    }

    this.guardando = true;
    this.consultaError = '';

    const payload = {
      dni: this.formulario.dni || null,
      ruc: this.formulario.ruc || null,
      nombres: this.formulario.nombres,
      apellidos: this.formulario.apellidos || null,
      nombre_empresa: this.formulario.nombreEmpresa || null,
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
      error: (error) => {
        if (error?.status === 401) {
          this.consultaError = 'Tu sesión expiró. Inicia sesión nuevamente para guardar el proveedor.';
          return;
        }

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
      nombreEmpresa: proveedor.nombre_empresa ?? '',
      direccion: proveedor.direccion ?? '',
      telefono: proveedor.telefono ?? ''
    };
  }

  eliminarProveedor(proveedor: ProveedorApi): void {
    this.consultaError = '';

    const confirmar = window.confirm('¿Deseas eliminar este proveedor?');
    if (!confirmar) {
      return;
    }

    const headers = this.obtenerHeaders();
    this.http.delete(`/api/proveedores/${proveedor.proveedor_id}`, { headers }).subscribe({
      next: () => this.cargarProveedores(),
      error: (error) => {
        if (error?.status === 401) {
          this.consultaError = 'Tu sesión expiró. Inicia sesión nuevamente para eliminar el proveedor.';
          return;
        }

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
      nombreEmpresa: '',
      direccion: '',
      telefono: ''
    };
  }

  private consultarApi(
    endpoint: string,
    autocompletar: (datos: Record<string, unknown>) => void
  ): void {
    const url = `https://apiperu.dev/api/${endpoint}?api_token=${this.token}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        this.consultaResultado = datos;
        autocompletar(datos);
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

  private autocompletarDesdeDni(datos: Record<string, unknown>): void {
    const apellidoPaterno = (datos['apellido_paterno'] as string) ?? '';
    const apellidoMaterno = (datos['apellido_materno'] as string) ?? '';
    const nombres = (datos['nombres'] as string) ?? (datos['nombre'] as string) ?? '';

    this.formulario = {
      ...this.formulario,
      dni: ((datos['numero'] as string) ?? this.consultaDocumento).toString(),
      nombres: nombres || (datos['nombre_completo'] as string) || this.formulario.nombres,
      apellidos:
        `${apellidoPaterno} ${apellidoMaterno}`.trim() ||
        (datos['apellido'] as string) ||
        this.formulario.apellidos,
      nombreEmpresa: ''
    };
  }

  private autocompletarDesdeRuc(datos: Record<string, unknown>): void {
    const nombreEmpresa =
      (datos['nombre_o_razon_social'] as string) ??
      (datos['razon_social'] as string) ??
      (datos['nombre_comercial'] as string) ??
      '';

    this.formulario = {
      ...this.formulario,
      ruc: ((datos['numero'] as string) ?? this.consultaDocumento).toString(),
      nombres: '',
      apellidos: '',
      nombreEmpresa: nombreEmpresa || this.formulario.nombreEmpresa,
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
    const headersBase = new HttpHeaders({ Accept: 'application/json' });

    return token
      ? headersBase.set('Authorization', `Bearer ${token}`)
      : headersBase;
  }
}
