import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface Producto {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

interface ProductoApi {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

interface VentaDiariaItem {
  ventaId: number | null;
  fecha: string;
  productoId: number | null;
  productoNombre: string;
  grupoVenta: 'HUEVOS' | 'CONGELADO' | 'OTROS' | null;
  filtroProducto: string;
  dropdownAbierto: boolean;
  cantidad: string;
  precio: string;
}

interface VentaCerradaItem {
  productoNombre: string;
  cantidad: number;
  precio: number;
  total: number;
  categoria: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

interface EstadoVentaApi {
  fecha: string;
  cerrado: boolean;
  filas: Array<{
    venta_op_diaria_id: number;
    producto_id: number;
    producto_nombre: string;
    grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
    cantidad: number;
    precio: number;
    cerrado_en: string | null;
  }>;
}

@Component({
  selector: 'app-privado-otros-productos-ventas-diarias',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './otros-productos-ventas-diarias.html',
  styleUrl: './otros-productos-ventas-diarias.css'
})
export class PrivadoOtrosProductosVentasDiarias implements OnInit {
  fechaHoy = this.obtenerFechaLocalISO();
  cerrado = false;
  productos: Producto[] = [];
  mensajeError = '';
  guardando = false;

  ventas: VentaDiariaItem[] = [this.crearFilaVacia(this.fechaHoy)];
  registrosCerrados: VentaCerradaItem[] = [];
  fechaUltimoCierre: string | null = null;

  private readonly guardado$ = new Subject<void>();

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarEstadoFecha();
    this.guardado$.pipe(debounceTime(500)).subscribe(() => {
      this.guardarBorrador();
    });
  }

  get totalHuevos(): number {
    return this.ventas.reduce((acc, venta) => {
      if (venta.grupoVenta !== 'HUEVOS') {
        return acc;
      }
      return acc + this.calcularTotalFila(venta);
    }, 0);
  }

  get totalCongelados(): number {
    return this.ventas.reduce((acc, venta) => {
      if (venta.grupoVenta !== 'CONGELADO') {
        return acc;
      }
      return acc + this.calcularTotalFila(venta);
    }, 0);
  }

  get totalHuevosCerrado(): number {
    return this.registrosCerrados
      .filter((item) => item.categoria === 'HUEVOS')
      .reduce((acc, item) => acc + item.total, 0);
  }

  get totalCongeladosCerrado(): number {
    return this.registrosCerrados
      .filter((item) => item.categoria === 'CONGELADO')
      .reduce((acc, item) => acc + item.total, 0);
  }

  crearFilaVacia(fecha: string): VentaDiariaItem {
    return {
      ventaId: null,
      fecha,
      productoId: null,
      productoNombre: '',
      grupoVenta: null,
      filtroProducto: '',
      dropdownAbierto: false,
      cantidad: '',
      precio: ''
    };
  }

  cambiarFecha(valor: string): void {
    this.fechaHoy = valor || this.obtenerFechaLocalISO();
    this.cargarEstadoFecha();
  }

  agregarFila(): void {
    this.ventas = [...this.ventas, this.crearFilaVacia(this.fechaHoy)];
    this.programarGuardado();
  }

  quitarFila(index: number): void {
    this.ventas = this.ventas.filter((_, i) => i !== index);
    if (this.ventas.length === 0) {
      this.ventas = [this.crearFilaVacia(this.fechaHoy)];
    }
    this.programarGuardado();
  }

  limpiarFila(index: number): void {
    this.ventas[index] = this.crearFilaVacia(this.fechaHoy);
    this.ventas = [...this.ventas];
    this.programarGuardado();
  }

  onFilaCambio(): void {
    this.programarGuardado();
  }

  calcularTotalFila(venta: VentaDiariaItem): number {
    const cantidad = this.parseNumero(venta.cantidad);
    const precio = this.parseNumero(venta.precio);
    return cantidad * precio;
  }

  cerrarDia(): void {
    const headers = this.obtenerHeaders();
    this.http.post('/api/otros-productos/ventas-diarias/cerrar', { fecha: this.fechaHoy }, { headers }).subscribe({
      next: () => {
        this.fechaUltimoCierre = this.fechaHoy;
        this.cargarEstadoFecha();
        this.fechaHoy = this.siguienteDia(this.fechaHoy);
        this.ventas = [this.crearFilaVacia(this.fechaHoy)];
        this.cerrado = false;
      },
      error: (error) => {
        this.mensajeError = error?.error?.message || 'No se pudo cerrar el día.';
      }
    });
  }

  reabrirDia(): void {
    if (!this.fechaUltimoCierre) {
      return;
    }

    const headers = this.obtenerHeaders();
    this.http.post('/api/otros-productos/ventas-diarias/reabrir', { fecha: this.fechaUltimoCierre }, { headers }).subscribe({
      next: () => {
        this.fechaHoy = this.fechaUltimoCierre ?? this.obtenerFechaLocalISO();
        this.fechaUltimoCierre = null;
        this.cargarEstadoFecha();
      },
      error: (error) => {
        this.mensajeError = error?.error?.message || 'No se pudo reabrir el día.';
      }
    });
  }

  toggleDropdownProducto(index: number): void {
    this.ventas = this.ventas.map((item, i) => ({
      ...item,
      dropdownAbierto: i === index ? !item.dropdownAbierto : false
    }));
  }

  seleccionarProducto(index: number, producto: Producto): void {
    const fila = this.ventas[index];
    if (!fila) {
      return;
    }

    fila.productoId = producto.id;
    fila.productoNombre = producto.nombre;
    fila.grupoVenta = producto.grupo_venta;
    fila.filtroProducto = producto.nombre;
    fila.dropdownAbierto = false;
    this.ventas = [...this.ventas];
    this.programarGuardado();
  }

  productosFiltrados(index: number): Producto[] {
    const fila = this.ventas[index];
    if (!fila) {
      return this.productos;
    }

    const valor = fila.filtroProducto.trim().toLowerCase();
    if (!valor) {
      return this.productos;
    }

    return this.productos.filter((producto) => producto.nombre.toLowerCase().includes(valor));
  }

  @HostListener('document:click', ['$event'])
  cerrarDropdownExterno(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.selector-producto')) {
      return;
    }

    this.ventas = this.ventas.map((item) => ({ ...item, dropdownAbierto: false }));
  }

  private cargarProductos(): void {
    const headers = this.obtenerHeaders();
    this.http.get<ProductoApi[]>('/api/otros-productos/productos', { headers }).subscribe({
      next: (productos) => {
        this.productos = productos;
      },
      error: () => {
        this.mensajeError = 'No pudimos cargar los productos para ventas diarias.';
      }
    });
  }

  private cargarEstadoFecha(): void {
    const headers = this.obtenerHeaders();
    const params = new HttpParams().set('fecha', this.fechaHoy);

    this.http.get<EstadoVentaApi>('/api/otros-productos/ventas-diarias', { headers, params }).subscribe({
      next: (estado) => {
        const filas = estado.filas.map((item) => ({
          ventaId: item.venta_op_diaria_id,
          fecha: estado.fecha,
          productoId: item.producto_id,
          productoNombre: item.producto_nombre,
          grupoVenta: item.grupo_venta,
          filtroProducto: item.producto_nombre,
          dropdownAbierto: false,
          cantidad: String(item.cantidad ?? ''),
          precio: String(item.precio ?? '')
        }));

        this.ventas = filas.length > 0 ? filas : [this.crearFilaVacia(this.fechaHoy)];
        this.cerrado = estado.cerrado;
        this.registrosCerrados = estado.cerrado
          ? filas.map((item) => ({
              productoNombre: item.productoNombre,
              cantidad: this.parseNumero(item.cantidad),
              precio: this.parseNumero(item.precio),
              total: this.calcularTotalFila(item),
              categoria: item.grupoVenta ?? 'OTROS'
            }))
          : [];

        if (estado.cerrado) {
          this.fechaUltimoCierre = estado.fecha;
        }
      },
      error: () => {
        this.ventas = [this.crearFilaVacia(this.fechaHoy)];
      }
    });
  }

  private guardarBorrador(): void {
    if (this.cerrado) {
      return;
    }

    const filasValidas = this.ventas
      .filter((fila) => fila.productoId && this.parseNumero(fila.cantidad) > 0 && this.parseNumero(fila.precio) >= 0)
      .map((fila) => ({
        producto_id: fila.productoId,
        cantidad: this.parseNumero(fila.cantidad),
        precio: this.parseNumero(fila.precio)
      }));

    this.guardando = true;
    const headers = this.obtenerHeaders();
    this.http.put('/api/otros-productos/ventas-diarias', { fecha: this.fechaHoy, filas: filasValidas }, { headers }).subscribe({
      next: () => {
        this.guardando = false;
      },
      error: () => {
        this.guardando = false;
      }
    });
  }

  private programarGuardado(): void {
    this.guardado$.next();
  }

  private parseNumero(valor: string | number | null | undefined): number {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : 0;
    }

    if (!valor) {
      return 0;
    }

    const normalizado = String(valor).replace(',', '.');
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  }

  private siguienteDia(fecha: string): string {
    const date = new Date(`${fecha}T00:00:00`);
    date.setDate(date.getDate() + 1);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private obtenerFechaLocalISO(): string {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - offset).toISOString().slice(0, 10);
  }
}
