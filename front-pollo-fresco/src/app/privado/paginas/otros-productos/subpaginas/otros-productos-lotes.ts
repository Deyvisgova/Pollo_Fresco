import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface LoteRegistro {
  id: number;
  tipo: 'CONGELADO' | 'HUEVO';
  productoId: number;
  productoNombre: string;
  cantidad: number;
  subtotal: number;
  estado: 'ABIERTO' | 'CERRADO';
}

interface Producto {
  id: number;
  nombre: string;
}

interface ProductoApi {
  id: number;
  nombre: string;
}

interface LoteApi {
  numero_lote: number;
  tipo: 'CONGELADO' | 'HUEVO';
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  costo_lote: number;
  estado: 'ABIERTO' | 'CERRADO';
}

interface LoteForm {
  id: number;
  fechaIngreso: string;
  costoLote: number | null;
  productoId: number | null;
  cantidad: number | null;
}

@Component({
  selector: 'app-privado-otros-productos-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './otros-productos-lotes.html',
  styleUrl: './otros-productos-lotes.css'
})
export class PrivadoOtrosProductosLotes implements OnInit {
  mostrarModal = false;
  mostrarModalProducto = false;
  filtro = '';
  nuevoProducto = '';
  buscadorProducto = '';
  mensajeError = '';
  productos: Producto[] = [];

  loteForm: LoteForm = {
    id: 0,
    fechaIngreso: new Date().toISOString().slice(0, 10),
    costoLote: null,
    productoId: null,
    cantidad: null
  };

  lotes: LoteRegistro[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  get lotesFiltrados(): LoteRegistro[] {
    const valor = this.filtro.trim().toLowerCase();
    if (!valor) {
      return this.lotes;
    }

    return this.lotes.filter((lote) => {
      return (
        lote.id.toString().includes(valor) ||
        lote.tipo.toLowerCase().includes(valor) ||
        lote.productoNombre.toLowerCase().includes(valor) ||
        lote.estado.toLowerCase().includes(valor)
      );
    });
  }

  abrirModal(): void {
    this.mostrarModal = true;
    this.buscadorProducto = '';
    this.mensajeError = '';
    this.loteForm = {
      id: 0,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      costoLote: null,
      productoId: null,
      cantidad: null
    };
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  abrirModalProducto(): void {
    this.mostrarModalProducto = true;
    this.nuevoProducto = '';
    this.mensajeError = '';
  }

  cerrarModalProducto(): void {
    this.mostrarModalProducto = false;
  }

  guardarProducto(): void {
    const nombre = this.nuevoProducto.trim();
    if (!nombre) {
      return;
    }
    this.mensajeError = '';

    const headers = this.obtenerHeaders();
    this.http
      .post<ProductoApi>('/api/otros-productos/productos', { nombre }, { headers })
      .subscribe({
        next: (producto) => {
          this.productos = [...this.productos, producto];
          this.loteForm.productoId = producto.id;
          this.buscadorProducto = producto.nombre;
          this.cerrarModalProducto();
        },
        error: () => {
          this.mensajeError = 'No pudimos guardar el producto. Intenta nuevamente.';
        }
      });
  }

  siguienteNumeroLote(productoId: number): number {
    const conteo = this.lotes.filter((lote) => lote.productoId === productoId).length;
    return conteo + 1;
  }

  get productosFiltrados(): Producto[] {
    const valor = this.buscadorProducto.trim().toLowerCase();
    if (!valor) {
      return this.productos;
    }
    return this.productos.filter((producto) => producto.nombre.toLowerCase().includes(valor));
  }

  guardarLote(): void {
    if (!this.loteForm.productoId || !this.loteForm.cantidad) {
      return;
    }

    this.mensajeError = '';
    const payload = {
      producto_id: this.loteForm.productoId,
      cantidad: this.loteForm.cantidad,
      costo_lote: this.loteForm.costoLote ?? 0,
      fecha_ingreso: this.loteForm.fechaIngreso
    };

    const headers = this.obtenerHeaders();
    this.http.post<LoteApi>('/api/otros-productos/lotes', payload, { headers }).subscribe({
      next: (respuesta) => {
        const nuevoRegistro: LoteRegistro = {
          id: respuesta.numero_lote,
          tipo: respuesta.tipo,
          productoId: respuesta.producto_id,
          productoNombre: respuesta.producto_nombre,
          cantidad: respuesta.cantidad,
          subtotal: respuesta.costo_lote,
          estado: respuesta.estado
        };

        this.lotes = [nuevoRegistro, ...this.lotes];
        this.cerrarModal();
      },
      error: () => {
        this.mensajeError = 'No pudimos guardar el lote. Revisa los datos e intenta nuevamente.';
      }
    });
  }

  editarLote(lote: LoteRegistro): void {
    if (lote.estado === 'CERRADO') {
      return;
    }

    // Placeholder para edición.
  }

  eliminarLote(lote: LoteRegistro): void {
    if (lote.estado === 'CERRADO') {
      return;
    }

    this.lotes = this.lotes.filter((item) => item !== lote);
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private cargarProductos(): void {
    const headers = this.obtenerHeaders();
    this.http.get<ProductoApi[]>('/api/otros-productos/productos', { headers }).subscribe({
      next: (productos) => {
        this.productos = productos;
      },
      error: () => {
        this.mensajeError = 'No pudimos cargar los productos. Intenta nuevamente.';
      }
    });
  }
}
