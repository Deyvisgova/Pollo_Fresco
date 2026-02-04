import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../servicios/sesion.servicio';

type TipoComprobante = 'factura' | 'boleta' | 'nota-venta' | 'nota-credito';
type TipoDocumentoCliente = 'ruc' | 'dni';

interface ClienteFactura {
  documento: string;
  nombre: string;
  direccion: string;
}

interface DetalleFactura {
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
}

interface ProductoApi {
  id: number;
  nombre: string;
}

interface MetodoPago {
  id: string;
  etiqueta: string;
  icono: string;
}

@Component({
  selector: 'app-privado-venta',
  // Componente informativo para la sección de venta.
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './venta.html',
  styleUrl: './venta.css'
})
export class PrivadoVenta implements OnInit {
  private token = 'f3ba6fa1f3a2b2d1a6390dc06d831ebad2f218a9d3ba43e7f1f42b425dd03e26';

  tipoComprobante: TipoComprobante = 'factura';
  tipoDocumentoCliente: TipoDocumentoCliente = 'ruc';

  serie = 'F001';
  numero = '00012345';
  fechaEmision = new Date().toISOString().split('T')[0];
  moneda = 'PEN';
  formaPago = 'Contado';

  referenciaSerie = '';
  referenciaNumero = '';
  referenciaMotivo = '';

  consultaDocumento = '';
  consultaCargando = false;
  mensajeError = '';

  cliente: ClienteFactura = {
    documento: '',
    nombre: '',
    direccion: ''
  };

  detalles: DetalleFactura[] = [];

  productosDisponibles: string[] = [];

  productoSeleccionado = '';
  productosFiltrados: string[] = [];
  mostrarModalProducto = false;
  nuevoProducto = '';
  metodoPagoSeleccionado = 'efectivo';
  montoRecibido: number | null = null;
  metodosPago: MetodoPago[] = [
    { id: 'efectivo', etiqueta: 'Efectivo', icono: '💵' },
    { id: 'tarjeta', etiqueta: 'Tarjeta', icono: '💳' },
    { id: 'transferencia', etiqueta: 'Transf.', icono: '🏦' },
    { id: 'plin', etiqueta: 'Plin', icono: '🟢' },
    { id: 'yape', etiqueta: 'Yape', icono: '🟣' },
    { id: 'otro', etiqueta: 'Otro', icono: '⋯' }
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.actualizarSerieNumero();
    this.cargarProductos();
  }

  actualizarSerieNumero(): void {
    const configuracion = {
      factura: { serie: 'F001', numero: '00012345' },
      boleta: { serie: 'B001', numero: '00004567' },
      'nota-venta': { serie: 'NV01', numero: '00000210' },
      'nota-credito': { serie: 'NC01', numero: '00000032' }
    } as const;

    const datos = configuracion[this.tipoComprobante];
    this.serie = datos.serie;
    this.numero = datos.numero;
  }

  get subtotal(): number {
    return this.detalles.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  }

  get total(): number {
    return this.subtotal;
  }

  get vuelto(): number {
    if (this.montoRecibido === null || Number.isNaN(this.montoRecibido)) {
      return 0;
    }
    return Math.max(this.montoRecibido - this.total, 0);
  }

  totalDetalle(item: DetalleFactura): number {
    return item.cantidad * item.precioUnitario;
  }

  agregarDetalle(): void {
    const descripcion = this.productoSeleccionado.trim();
    if (!descripcion) {
      return;
    }
    this.detalles = [
      ...this.detalles,
      { descripcion, unidad: 'KG', cantidad: 1, precioUnitario: 0 }
    ];
    this.productoSeleccionado = '';
  }

  seleccionarProductoDesdeBuscador(): void {
    const seleccionado = this.productoSeleccionado.trim().toLowerCase();
    if (!seleccionado) {
      return;
    }
    const existe = this.productosDisponibles.some(
      (producto) => producto.toLowerCase() === seleccionado
    );
    if (existe) {
      this.agregarDetalle();
    }
  }

  filtrarProductos(): void {
    const termino = this.productoSeleccionado.trim().toLowerCase();
    if (!termino) {
      this.productosFiltrados = [];
      return;
    }
    this.productosFiltrados = this.productosDisponibles.filter((producto) =>
      producto.toLowerCase().includes(termino)
    );
  }

  actualizarBusquedaProductos(): void {
    this.cargarProductos(this.productoSeleccionado);
  }

  abrirModalProducto(): void {
    this.mostrarModalProducto = true;
  }

  cerrarModalProducto(): void {
    this.mostrarModalProducto = false;
    this.nuevoProducto = '';
  }

  guardarProductoNuevo(): void {
    const nombre = this.nuevoProducto.trim();
    if (!nombre) {
      return;
    }

    const headers = this.obtenerHeaders();
    this.http
      .post<ProductoApi>('/api/otros-productos/productos', { nombre }, { headers })
      .subscribe({
        next: (producto) => {
          const nombreProducto = producto?.nombre ?? nombre;
          this.productosDisponibles = [...this.productosDisponibles, nombreProducto];
          this.filtrarProductos();
          this.nuevoProducto = '';
          this.mostrarModalProducto = false;
        },
        error: () => {
          this.mostrarModalProducto = false;
        }
      });
  }

  private cargarProductos(termino: string = ''): void {
    const limpio = termino.trim();
    const params = limpio ? new HttpParams().set('buscar', limpio) : undefined;
    const headers = this.obtenerHeaders();

    this.http.get<ProductoApi[]>('/api/otros-productos/productos', { params, headers }).subscribe({
      next: (productos) => {
        this.productosDisponibles = productos.map((producto) => producto.nombre);
        this.filtrarProductos();
      },
      error: () => {
        this.filtrarProductos();
      }
    });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  eliminarDetalle(index: number): void {
    this.detalles = this.detalles.filter((_, i) => i !== index);
  }

  seleccionarMetodoPago(metodoId: string): void {
    this.metodoPagoSeleccionado = metodoId;
    if (metodoId !== 'efectivo') {
      this.montoRecibido = null;
    }
  }

  consultarDocumento(): void {
    this.mensajeError = '';

    if (!this.consultaDocumento.trim()) {
      this.mensajeError = 'Ingresa el número de documento.';
      return;
    }

    const longitudEsperada = this.tipoDocumentoCliente === 'dni' ? 8 : 11;
    if (this.consultaDocumento.length !== longitudEsperada) {
      this.mensajeError = `El ${this.tipoDocumentoCliente.toUpperCase()} debe tener ${longitudEsperada} dígitos.`;
      return;
    }

    const endpoint = this.tipoDocumentoCliente === 'dni' ? 'dni' : 'ruc';
    const url = `https://apiperu.dev/api/${endpoint}/${this.consultaDocumento}?api_token=${this.token}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        if (this.tipoDocumentoCliente === 'dni') {
          this.autocompletarDesdeDni(datos);
        } else {
          this.autocompletarDesdeRuc(datos);
        }
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

  private autocompletarDesdeDni(datos: Record<string, unknown>): void {
    const apellidoPaterno = (datos['apellido_paterno'] as string) ?? '';
    const apellidoMaterno = (datos['apellido_materno'] as string) ?? '';
    const nombres = (datos['nombres'] as string) ?? (datos['nombre'] as string) ?? '';

    this.cliente = {
      ...this.cliente,
      documento: ((datos['numero'] as string) ?? this.consultaDocumento).toString(),
      nombre:
        (datos['nombre_completo'] as string) ||
        `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim() ||
        this.cliente.nombre
    };
  }

  private autocompletarDesdeRuc(datos: Record<string, unknown>): void {
    this.cliente = {
      ...this.cliente,
      documento: ((datos['numero'] as string) ?? this.consultaDocumento).toString(),
      nombre:
        (datos['nombre_o_razon_social'] as string) ??
        (datos['razon_social'] as string) ??
        (datos['nombre_comercial'] as string) ??
        this.cliente.nombre,
      direccion: (datos['direccion'] as string) ?? this.cliente.direccion
    };
  }
}
