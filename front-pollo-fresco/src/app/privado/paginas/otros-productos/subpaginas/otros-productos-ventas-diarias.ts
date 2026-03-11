import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface Producto {
  id: number;
  nombre: string;
}

interface ProductoApi {
  id: number;
  nombre: string;
}

interface VentaDiariaItem {
  productoId: number | null;
  productoNombre: string;
  filtroProducto: string;
  dropdownAbierto: boolean;
  cantidad: number | null;
  precio: number | null;
}

interface VentaCerradaItem {
  productoNombre: string;
  cantidad: number;
  precio: number;
  total: number;
  categoria: 'HUEVOS' | 'CONGELADOS';
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

  ventas: VentaDiariaItem[] = [this.crearFilaVacia()];
  registrosCerrados: VentaCerradaItem[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  get totalHuevos(): number {
    return this.ventas.reduce((acc, venta) => {
      if (!this.esProductoHuevo(venta.productoNombre)) {
        return acc;
      }
      return acc + this.calcularTotalFila(venta);
    }, 0);
  }

  get totalCongelados(): number {
    return this.ventas.reduce((acc, venta) => {
      if (this.esProductoHuevo(venta.productoNombre)) {
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
      .filter((item) => item.categoria === 'CONGELADOS')
      .reduce((acc, item) => acc + item.total, 0);
  }

  crearFilaVacia(): VentaDiariaItem {
    return {
      productoId: null,
      productoNombre: '',
      filtroProducto: '',
      dropdownAbierto: false,
      cantidad: null,
      precio: null
    };
  }

  agregarFila(): void {
    if (this.cerrado) {
      return;
    }
    this.ventas = [...this.ventas, this.crearFilaVacia()];
  }

  quitarFila(index: number): void {
    if (this.cerrado) {
      return;
    }

    this.ventas = this.ventas.filter((_, i) => i !== index);
    if (this.ventas.length === 0) {
      this.ventas = [this.crearFilaVacia()];
    }
  }

  limpiarFila(index: number): void {
    if (this.cerrado) {
      return;
    }

    this.ventas[index] = this.crearFilaVacia();
    this.ventas = [...this.ventas];
  }

  calcularTotalFila(venta: VentaDiariaItem): number {
    const cantidad = venta.cantidad ?? 0;
    const precio = venta.precio ?? 0;
    return cantidad * precio;
  }

  cerrarDia(): void {
    if (this.cerrado) {
      return;
    }

    this.registrosCerrados = this.ventas
      .filter((item) => item.productoNombre && (item.cantidad ?? 0) > 0 && (item.precio ?? 0) > 0)
      .map((item) => ({
        productoNombre: item.productoNombre,
        cantidad: item.cantidad ?? 0,
        precio: item.precio ?? 0,
        total: this.calcularTotalFila(item),
        categoria: this.esProductoHuevo(item.productoNombre) ? 'HUEVOS' : 'CONGELADOS'
      }));

    this.cerrado = true;
    this.ventas = [this.crearFilaVacia()];
  }

  reabrirDia(): void {
    this.cerrado = false;
    this.registrosCerrados = [];
    if (this.ventas.length === 0) {
      this.ventas = [this.crearFilaVacia()];
    }
  }

  toggleDropdownProducto(index: number): void {
    if (this.cerrado) {
      return;
    }

    this.ventas = this.ventas.map((item, i) => ({
      ...item,
      dropdownAbierto: i === index ? !item.dropdownAbierto : false
    }));
  }

  seleccionarProducto(index: number, producto: Producto): void {
    if (this.cerrado) {
      return;
    }

    const fila = this.ventas[index];
    if (!fila) {
      return;
    }

    fila.productoId = producto.id;
    fila.productoNombre = producto.nombre;
    fila.filtroProducto = producto.nombre;
    fila.dropdownAbierto = false;
    this.ventas = [...this.ventas];
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

  private esProductoHuevo(nombreProducto: string): boolean {
    return nombreProducto.toLowerCase().includes('huevo');
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
