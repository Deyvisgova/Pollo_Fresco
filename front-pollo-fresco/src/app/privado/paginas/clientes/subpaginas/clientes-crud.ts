import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface ClienteApi {
  cliente_id: number;
  dni: string | null;
  ruc: string | null;
  nombres: string;
  apellidos: string;
  celular: string | null;
  direccion: string | null;
  direccion_fiscal: string | null;
  referencias: string | null;
  creado_en: string;
  actualizado_en: string;
}

interface ClienteFormulario {
  cliente_id: number | null;
  dni: string;
  ruc: string;
  nombres: string;
  apellidos: string;
  celular: string;
  direccion: string;
  direccionFiscal: string;
  referencias: string;
}

@Component({
  selector: 'app-privado-clientes-crud',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './clientes-crud.html',
  styleUrl: './clientes-crud.css'
})
export class PrivadoClientesCrud implements OnInit {
  private token = 'f3ba6fa1f3a2b2d1a6390dc06d831ebad2f218a9d3ba43e7f1f42b425dd03e26';

  consultaDni = '';
  consultaCargando = false;
  guardando = false;
  cargando = false;
  mensajeError = '';
  filtro = '';

  clientes: ClienteApi[] = [];

  formulario: ClienteFormulario = {
    cliente_id: null,
    dni: '',
    ruc: '',
    nombres: '',
    apellidos: '',
    celular: '',
    direccion: '',
    direccionFiscal: '',
    referencias: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  consultarDni(): void {
    this.mensajeError = '';

    if (!this.consultaDni.trim()) {
      this.mensajeError = 'Ingresa el DNI para consultar.';
      return;
    }

    if (this.consultaDni.length !== 8) {
      this.mensajeError = 'El DNI debe tener 8 dígitos.';
      return;
    }

    const url = `https://apiperu.dev/api/dni/${this.consultaDni}?api_token=${this.token}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        this.autocompletarDesdeDni(datos);
      },
      error: () => {
        this.mensajeError = 'No pudimos conectar con la SUNAT/RENIEC. Revisa el número e intenta nuevamente.';
        this.consultaCargando = false;
      },
      complete: () => {
        this.consultaCargando = false;
      }
    });
  }

  guardarCliente(): void {
    this.mensajeError = '';

    if (!this.formulario.nombres.trim() || !this.formulario.apellidos.trim()) {
      this.mensajeError = 'Completa los nombres y apellidos del cliente.';
      return;
    }

    this.guardando = true;

    const payload = {
      dni: this.formulario.dni || null,
      ruc: this.formulario.ruc || null,
      nombres: this.formulario.nombres,
      apellidos: this.formulario.apellidos,
      celular: this.formulario.celular || null,
      direccion: this.formulario.direccion || null,
      direccion_fiscal: this.formulario.direccionFiscal || null,
      referencias: this.formulario.referencias || null
    };

    const headers = this.obtenerHeaders();
    const request = this.formulario.cliente_id
      ? this.http.put<ClienteApi>(`/api/clientes/${this.formulario.cliente_id}`, payload, { headers })
      : this.http.post<ClienteApi>('/api/clientes', payload, { headers });

    request.subscribe({
      next: () => {
        this.cargarClientes(this.filtro);
        this.limpiarFormulario();
      },
      error: () => {
        this.mensajeError = 'No se pudo guardar el cliente. Revisa los datos e intenta nuevamente.';
      },
      complete: () => {
        this.guardando = false;
      }
    });
  }

  editarCliente(cliente: ClienteApi): void {
    this.formulario = {
      cliente_id: cliente.cliente_id,
      dni: cliente.dni ?? '',
      ruc: cliente.ruc ?? '',
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      celular: cliente.celular ?? '',
      direccion: cliente.direccion ?? '',
      direccionFiscal: cliente.direccion_fiscal ?? '',
      referencias: cliente.referencias ?? ''
    };
  }

  eliminarCliente(cliente: ClienteApi): void {
    const headers = this.obtenerHeaders();
    this.http.delete(`/api/clientes/${cliente.cliente_id}`, { headers }).subscribe({
      next: () => this.cargarClientes(this.filtro),
      error: () => {
        this.mensajeError = 'No se pudo eliminar el cliente.';
      }
    });
  }

  limpiarFormulario(): void {
    this.formulario = {
      cliente_id: null,
      dni: '',
      ruc: '',
      nombres: '',
      apellidos: '',
      celular: '',
      direccion: '',
      direccionFiscal: '',
      referencias: ''
    };
  }

  buscarClientes(): void {
    this.cargarClientes(this.filtro);
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

  private cargarClientes(search?: string): void {
    this.cargando = true;
    this.mensajeError = '';
    const headers = this.obtenerHeaders();
    const options: { headers: HttpHeaders; params?: Record<string, string> } = { headers };

    if (search && search.trim()) {
      options.params = { search: search.trim() };
    }

    this.http.get<ClienteApi[]>('/api/clientes', options).subscribe({
      next: (clientes) => {
        this.clientes = clientes;
      },
      error: () => {
        this.mensajeError = 'No se pudo cargar la lista de clientes.';
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
