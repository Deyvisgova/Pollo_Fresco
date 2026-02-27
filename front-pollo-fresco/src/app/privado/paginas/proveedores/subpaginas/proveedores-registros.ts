import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface RegistroEntrega {
  entrega_id: number;
  proveedor_id: number;
  proveedor?: { nombres: string; apellidos: string | null; ruc: string | null; dni: string | null };
  usuario_id: number;
  fecha_hora: string;
  cantidad_pollos: number;
  peso_total_kg: number;
  merma_kg: number;
  costo_total: number;
  tipo: string | null;
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
  tipoAve: string;
  cantidadPollos: number | null;
  pesoTotalKg: number | null;
  mermaKg: number | null;
  precioKg: number | null;
  horaEntrega: string;
}

interface TarjetaProveedor {
  proveedor: ProveedorApi;
  lineas: RegistroLinea[];
  guardando: boolean;
  error: string;
}

@Component({
  selector: 'app-privado-proveedores-registros',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './proveedores-registros.html',
  styleUrl: './proveedores-registros.css'
})
export class PrivadoProveedoresRegistros implements OnInit {
  readonly tiposAveDisponibles = ['POLLO', 'GALLINA'];

  registros: RegistroEntrega[] = [];
  proveedores: ProveedorApi[] = [];
  busquedaProveedor = '';
  tarjetasProveedor: TarjetaProveedor[] = [];

  fechaEntrega = '';
  usuarioNombre = 'Usuario';
  usuarioId = 0;

  cargando = false;
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
    const yaExiste = this.tarjetasProveedor.some(
      (tarjeta) => tarjeta.proveedor.proveedor_id === proveedor.proveedor_id
    );

    if (!yaExiste) {
      this.tarjetasProveedor = [
        ...this.tarjetasProveedor,
        {
          proveedor,
          lineas: [this.crearLineaInicial()],
          guardando: false,
          error: ''
        }
      ];
    }

    this.busquedaProveedor = '';
    this.proveedores = [];
  }

  agregarLinea(proveedorId: number): void {
    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    tarjeta.lineas = [...tarjeta.lineas, this.crearLineaInicial()];
  }

  eliminarLinea(proveedorId: number, indice: number): void {
    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    tarjeta.lineas = tarjeta.lineas.filter((_, posicion) => posicion !== indice);

    if (tarjeta.lineas.length === 0) {
      tarjeta.lineas = [this.crearLineaInicial()];
    }
  }

  guardarRegistro(proveedorId: number): void {
    this.error = '';

    if (this.usuarioId === 0) {
      this.error = 'No se encontró usuario autenticado.';
      return;
    }

    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    const lineasValidas = tarjeta.lineas.filter((linea) => (linea.pesoTotalKg ?? 0) > 0);

    if (lineasValidas.length === 0) {
      tarjeta.error = 'Ingresa al menos una línea con peso mayor a 0.';
      return;
    }

    tarjeta.error = '';
    tarjeta.guardando = true;

    const headers = this.obtenerHeaders();
    const requests = lineasValidas.map((linea) => {
      const cantidad = linea.cantidadPollos ?? 0;
      const peso = linea.pesoTotalKg ?? 0;
      const mermaPorPollo = linea.mermaKg ?? 0;
      const precio = linea.precioKg ?? 0;
      const mermaTotal = cantidad * mermaPorPollo;

      const payload = {
        proveedor_id: tarjeta.proveedor.proveedor_id,
        usuario_id: this.usuarioId,
        fecha_hora: this.construirFechaHora(linea.horaEntrega),
        cantidad_pollos: cantidad,
        peso_total_kg: peso,
        merma_kg: mermaTotal,
        costo_total: (peso + mermaTotal) * precio,
        tipo: linea.tipoAve
      };

      return this.http.post<RegistroEntrega>('/api/entregas-proveedor', payload, { headers });
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.cargarRegistros();
        this.limpiarFormulario(proveedorId);
      },
      error: () => {
        tarjeta.error = 'No se pudo guardar la entrega.';
      },
      complete: () => {
        tarjeta.guardando = false;
      }
    });
  }

  limpiarFormulario(proveedorId: number): void {
    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    tarjeta.lineas = [this.crearLineaInicial()];
    tarjeta.error = '';
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

  private crearLineaInicial(): RegistroLinea {
    return {
      tipoAve: this.tiposAveDisponibles[0],
      cantidadPollos: null,
      pesoTotalKg: null,
      mermaKg: null,
      precioKg: null,
      horaEntrega: this.obtenerHoraActual()
    };
  }

  private obtenerHoraActual(): string {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  private construirFechaHora(horaEntrega: string): string {
    return `${this.fechaEntrega} ${horaEntrega}:00`;
  }

  private obtenerTarjeta(proveedorId: number): TarjetaProveedor | undefined {
    return this.tarjetasProveedor.find((tarjeta) => tarjeta.proveedor.proveedor_id === proveedorId);
  }

  private obtenerFechaActual(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
