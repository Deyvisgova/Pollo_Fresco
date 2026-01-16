import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface RegistroEntrega {
  entrega_id: number;
  proveedor_id: number;
  proveedor?: { nombres: string; apellidos: string | null; ruc: string | null; dni: string | null };
  usuario_id: number;
  fecha_entrega: string;
  cantidad_pollos: number;
  peso_total_kg: number;
  merma_kg: number;
  costo_total: number;
  observacion: string | null;
  creado_en: string;
}

interface ProveedorApi {
  proveedor_id: number;
  nombres: string;
  apellidos: string | null;
  ruc: string | null;
  dni: string | null;
}

interface RegistroLinea {
  cantidadPollos: number | null;
  pesoTotalKg: number | null;
  mermaKg: number | null;
  precioKg: number | null;
}

@Component({
  selector: 'app-privado-proveedores-registros',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './proveedores-registros.html',
  styleUrl: './proveedores-registros.css'
})
export class PrivadoProveedoresRegistros implements OnInit {
  registros: RegistroEntrega[] = [];
  proveedores: ProveedorApi[] = [];
  busquedaProveedor = '';
  proveedorSeleccionado: ProveedorApi | null = null;

  fechaEntrega = '';
  usuarioNombre = 'Usuario';
  usuarioId = 0;

  lineas: RegistroLinea[] = [
    {
      cantidadPollos: null,
      pesoTotalKg: null,
      mermaKg: null,
      precioKg: null
    }
  ];

  observacion = '';
  cargando = false;
  guardando = false;
  error = '';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.fechaEntrega = this.obtenerFechaActual();
    this.usuarioNombre = this.sesionServicio.obtenerUsuario()?.name ?? 'Usuario';
    this.usuarioId = this.sesionServicio.obtenerUsuario()?.id ?? 0;
    this.cargarRegistros();
  }

  buscarProveedor(): void {
    const termino = this.busquedaProveedor.trim();
    if (!termino) {
      this.proveedores = [];
      return;
    }

    const headers = this.obtenerHeaders();
    this.http
      .get<ProveedorApi[]>(`/api/proveedores?search=${encodeURIComponent(termino)}`, { headers })
      .subscribe({
        next: (proveedores) => {
          this.proveedores = proveedores;
        },
        error: () => {
          this.error = 'No se pudo buscar proveedores.';
        }
      });
  }

  seleccionarProveedor(proveedor: ProveedorApi): void {
    this.proveedorSeleccionado = proveedor;
    this.busquedaProveedor = this.formatearProveedor(proveedor);
    this.proveedores = [];
  }

  agregarLinea(): void {
    this.lineas = [
      ...this.lineas,
      {
        cantidadPollos: null,
        pesoTotalKg: null,
        mermaKg: null,
        precioKg: null
      }
    ];
  }

  eliminarLinea(indice: number): void {
    this.lineas = this.lineas.filter((_, posicion) => posicion !== indice);
  }

  guardarRegistro(): void {
    this.error = '';

    if (!this.proveedorSeleccionado) {
      this.error = 'Selecciona un proveedor guardado.';
      return;
    }

    if (this.usuarioId === 0) {
      this.error = 'No se encontró usuario autenticado.';
      return;
    }

    const totales = this.calcularTotales();

    if (totales.pesoTotalKg === 0) {
      this.error = 'Ingresa los valores de la entrega.';
      return;
    }

    const headers = this.obtenerHeaders();
    this.guardando = true;

    const payload = {
      proveedor_id: this.proveedorSeleccionado.proveedor_id,
      usuario_id: this.usuarioId,
      fecha_entrega: this.fechaEntrega,
      cantidad_pollos: totales.cantidadPollos,
      peso_total_kg: totales.pesoTotalKg,
      merma_kg: totales.mermaKg,
      costo_total: totales.costoTotal,
      observacion: this.observacion || null
    };

    this.http.post<RegistroEntrega>('/api/entregas-proveedor', payload, { headers }).subscribe({
      next: () => {
        this.cargarRegistros();
        this.limpiarFormulario();
      },
      error: () => {
        this.error = 'No se pudo guardar la entrega.';
      },
      complete: () => {
        this.guardando = false;
      }
    });
  }

  limpiarFormulario(): void {
    this.lineas = [
      {
        cantidadPollos: null,
        pesoTotalKg: null,
        mermaKg: null,
        precioKg: null
      }
    ];
    this.observacion = '';
  }

  obtenerTotales(): { pesoTotalKg: number; mermaKg: number; costoTotal: number; cantidadPollos: number } {
    return this.calcularTotales();
  }

  private cargarRegistros(): void {
    this.cargando = true;
    const headers = this.obtenerHeaders();
    this.http.get<RegistroEntrega[]>('/api/entregas-proveedor', { headers }).subscribe({
      next: (registros) => {
        this.registros = registros;
      },
      error: () => {
        this.error = 'No se pudo cargar el historial de entregas.';
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  private calcularTotales(): {
    cantidadPollos: number;
    pesoTotalKg: number;
    mermaKg: number;
    costoTotal: number;
  } {
    return this.lineas.reduce(
      (acc, linea) => {
        const cantidad = linea.cantidadPollos ?? 0;
        const peso = linea.pesoTotalKg ?? 0;
        const merma = linea.mermaKg ?? 0;
        const precio = linea.precioKg ?? 0;
        const kgConMerma = peso + peso * merma;
        const costo = kgConMerma * precio;

        return {
          cantidadPollos: acc.cantidadPollos + cantidad,
          pesoTotalKg: acc.pesoTotalKg + peso,
          mermaKg: acc.mermaKg + merma,
          costoTotal: acc.costoTotal + costo
        };
      },
      { cantidadPollos: 0, pesoTotalKg: 0, mermaKg: 0, costoTotal: 0 }
    );
  }

  private formatearProveedor(proveedor: ProveedorApi): string {
    const documento = proveedor.ruc || proveedor.dni || '';
    return [proveedor.nombres, proveedor.apellidos].filter(Boolean).join(' ').trim() + ` (${documento})`;
  }

  private obtenerFechaActual(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
