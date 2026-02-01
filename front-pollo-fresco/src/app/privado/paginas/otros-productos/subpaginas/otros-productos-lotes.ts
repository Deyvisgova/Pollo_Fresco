import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface LoteRegistro {
  compraLoteId: number;
  numeroLote: number;
  nombre: string;
  productoId: number;
  cantidad: number;
  total: number;
  fechaIngreso: string;
  estado: 'ABIERTO' | 'CERRADO';
  proveedorId: number | null;
  proveedorNombre: string;
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
  compra_lote_id: number;
  fecha_ingreso: string;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  costo_lote: number;
  estado: 'ABIERTO' | 'CERRADO';
  proveedor_id: number | null;
  proveedor_nombres: string | null;
  proveedor_apellidos: string | null;
  proveedor_nombre_empresa: string | null;
  proveedor_ruc: string | null;
  proveedor_dni: string | null;
}

interface LoteForm {
  id: number;
  fechaIngreso: string;
  costoLote: number | null;
  productoId: number | null;
  cantidad: number | null;
  proveedorId: number | null;
}

interface ProveedorApi {
  proveedor_id: number;
  nombres: string;
  apellidos: string | null;
  nombre_empresa: string | null;
  ruc: string | null;
  dni: string | null;
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
  filtroProducto = '';
  dropdownProductoAbierto = false;
  mensajeError = '';
  productos: Producto[] = [];
  proveedores: ProveedorApi[] = [];
  loteEnEdicion: LoteRegistro | null = null;

  loteForm: LoteForm = {
    id: 0,
    fechaIngreso: new Date().toISOString().slice(0, 10),
    costoLote: null,
    productoId: null,
    cantidad: null,
    proveedorId: null
  };

  lotes: LoteRegistro[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarProveedores();
    this.cargarLotes();
  }

  get lotesFiltrados(): LoteRegistro[] {
    const valor = this.filtro.trim().toLowerCase();
    if (!valor) {
      return this.lotes;
    }

    return this.lotes.filter((lote) => {
      return (
        lote.numeroLote.toString().includes(valor) ||
        lote.nombre.toLowerCase().includes(valor) ||
        lote.proveedorNombre.toLowerCase().includes(valor) ||
        lote.estado.toLowerCase().includes(valor) ||
        lote.fechaIngreso.toLowerCase().includes(valor)
      );
    });
  }

  abrirModal(): void {
    this.mostrarModal = true;
    this.filtroProducto = '';
    this.dropdownProductoAbierto = false;
    this.mensajeError = '';
    this.loteEnEdicion = null;
    this.loteForm = {
      id: 0,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      costoLote: null,
      productoId: null,
      cantidad: null,
      proveedorId: null
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
          this.filtroProducto = producto.nombre;
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
    const valor = this.filtroProducto.trim().toLowerCase();
    if (!valor) {
      return this.productos;
    }
    return this.productos.filter((producto) => producto.nombre.toLowerCase().includes(valor));
  }

  toggleDropdownProducto(): void {
    this.dropdownProductoAbierto = !this.dropdownProductoAbierto;
  }

  seleccionarProductoId(producto: Producto): void {
    this.loteForm.productoId = producto.id;
    this.filtroProducto = producto.nombre;
    this.dropdownProductoAbierto = false;
  }

  get nombreProductoSeleccionado(): string {
    if (!this.loteForm.productoId) {
      return '';
    }
    return this.productos.find((item) => item.id === this.loteForm.productoId)?.nombre ?? '';
  }

  guardarLote(): void {
    if (!this.loteForm.productoId || !this.loteForm.cantidad || !this.loteForm.proveedorId) {
      this.mensajeError = 'Completa el producto, la cantidad y el proveedor.';
      return;
    }

    this.mensajeError = '';
    const payload = {
      producto_id: this.loteForm.productoId,
      cantidad: this.loteForm.cantidad,
      costo_lote: this.loteForm.costoLote ?? 0,
      fecha_ingreso: this.loteForm.fechaIngreso,
      proveedor_id: this.loteForm.proveedorId
    };

    const headers = this.obtenerHeaders();
    const request = this.loteEnEdicion
      ? this.http.put<LoteApi>(`/api/otros-productos/lotes/${this.loteEnEdicion.compraLoteId}`, payload, { headers })
      : this.http.post<LoteApi>('/api/otros-productos/lotes', payload, { headers });

    request.subscribe({
      next: (respuesta) => {
        const nuevoRegistro: LoteRegistro = {
          compraLoteId: respuesta.compra_lote_id,
          numeroLote: respuesta.numero_lote,
          nombre: respuesta.producto_nombre,
          productoId: respuesta.producto_id,
          cantidad: respuesta.cantidad,
          total: respuesta.costo_lote,
          fechaIngreso: respuesta.fecha_ingreso,
          estado: respuesta.estado,
          proveedorId: respuesta.proveedor_id ?? null,
          proveedorNombre: this.obtenerNombreProveedor(respuesta.proveedor_id)
        };

        if (this.loteEnEdicion) {
          this.lotes = this.lotes.map((item) =>
            item.compraLoteId === this.loteEnEdicion?.compraLoteId ? nuevoRegistro : item
          );
        } else {
          this.lotes = [nuevoRegistro, ...this.lotes];
        }
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

    this.loteEnEdicion = lote;
    this.mostrarModal = true;
    this.filtroProducto = lote.nombre;
    this.dropdownProductoAbierto = false;
    this.loteForm = {
      id: lote.numeroLote,
      fechaIngreso: lote.fechaIngreso,
      costoLote: lote.total,
      productoId: lote.productoId,
      cantidad: lote.cantidad,
      proveedorId: lote.proveedorId
    };
  }

  eliminarLote(lote: LoteRegistro): void {
    if (lote.estado === 'CERRADO') {
      return;
    }

    const swal = (window as unknown as { Swal?: { fire: (options: Record<string, unknown>) => Promise<{ isConfirmed: boolean }> } }).Swal;
    if (!swal) {
      return;
    }

    swal
      .fire({
        title: '¿Eliminar lote?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      })
      .then((resultado) => {
        if (!resultado.isConfirmed) {
          return;
        }
        const headers = this.obtenerHeaders();
        this.http
          .delete(`/api/otros-productos/lotes/${lote.compraLoteId}`, { headers })
          .subscribe({
            next: () => {
              this.lotes = this.lotes.filter((item) => item.compraLoteId !== lote.compraLoteId);
              swal.fire({
                title: 'Eliminado',
                text: 'El lote se eliminó correctamente.',
                icon: 'success',
              });
            },
            error: () => {
              this.mensajeError = 'No pudimos eliminar el lote. Intenta nuevamente.';
              swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar el lote.',
                icon: 'error',
              });
            }
          });
      });
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

  private cargarLotes(): void {
    const headers = this.obtenerHeaders();
    this.http.get<LoteApi[]>('/api/otros-productos/lotes', { headers }).subscribe({
      next: (lotes) => {
        this.lotes = lotes.map((lote) => ({
          compraLoteId: lote.compra_lote_id,
          numeroLote: lote.numero_lote,
          nombre: lote.producto_nombre,
          productoId: lote.producto_id,
          cantidad: lote.cantidad,
          total: lote.costo_lote,
          fechaIngreso: lote.fecha_ingreso,
          estado: lote.estado,
          proveedorId: lote.proveedor_id ?? null,
          proveedorNombre: this.formatearProveedorDesdeLote(lote),
        }));
      },
      error: () => {
        this.mensajeError = 'No pudimos cargar los lotes. Intenta nuevamente.';
      }
    });
  }

  private cargarProveedores(): void {
    const headers = this.obtenerHeaders();
    this.http.get<ProveedorApi[]>('/api/proveedores', { headers }).subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores;
      },
      error: () => {
        this.mensajeError = 'No pudimos cargar los proveedores. Intenta nuevamente.';
      }
    });
  }

  formatearProveedor(proveedor: ProveedorApi): string {
    const nombrePersona = [proveedor.nombres, proveedor.apellidos].filter(Boolean).join(' ').trim();
    const nombreEmpresa = proveedor.nombre_empresa?.trim();
    const base = nombreEmpresa ? `${nombreEmpresa} - ${nombrePersona}` : nombrePersona;
    const documento = proveedor.ruc || proveedor.dni || '';
    return documento ? `${base} (${documento})` : base;
  }

  private formatearProveedorDesdeLote(lote: LoteApi): string {
    if (!lote.proveedor_id) {
      return 'Sin proveedor';
    }
    const nombrePersona = [lote.proveedor_nombres, lote.proveedor_apellidos].filter(Boolean).join(' ').trim();
    const nombreEmpresa = lote.proveedor_nombre_empresa?.trim();
    const base = nombreEmpresa ? `${nombreEmpresa} - ${nombrePersona}` : nombrePersona;
    const documento = lote.proveedor_ruc || lote.proveedor_dni || '';
    return documento ? `${base} (${documento})` : base;
  }

  private obtenerNombreProveedor(proveedorId: number | null): string {
    if (!proveedorId) {
      return 'Sin proveedor';
    }
    const proveedor = this.proveedores.find((item) => item.proveedor_id === proveedorId);
    return proveedor ? this.formatearProveedor(proveedor) : 'Proveedor pendiente';
  }

  @HostListener('document:click', ['$event'])
  cerrarDropdownExterno(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.selector-producto')) {
      this.dropdownProductoAbierto = false;
    }
  }
}
