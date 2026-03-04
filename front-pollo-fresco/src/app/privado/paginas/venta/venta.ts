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
  cantidad: number | null;
  precioUnitario: number | null;
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

interface VentaGuardada {
  comprobante_venta_id: number;
  serie: string;
  numero: string;
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
  guardandoVenta = false;
  mensajeVenta = '';
  errorVenta = '';
  ultimaVentaEmitida: VentaGuardada | null = null;
  formatoVoucher: 'a4' | 'ticket-80' | 'ticket-57' = 'a4';
  mostrarModalVoucher = false;

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
    return this.detalles.reduce((acc, item) => {
      const cantidad = item.cantidad ?? 0;
      const precio = item.precioUnitario ?? 0;
      return acc + cantidad * precio;
    }, 0);
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
    const cantidad = item.cantidad ?? 0;
    const precio = item.precioUnitario ?? 0;
    return cantidad * precio;
  }

  agregarDetalle(descripcion: string = ''): void {
    const descripcionLimpia = descripcion.trim();
    this.detalles = [
      ...this.detalles,
      {
        descripcion: descripcionLimpia,
        unidad: 'KG',
        cantidad: null,
        precioUnitario: null
      }
    ];
  }

  agregarDetalleVacio(): void {
    this.agregarDetalle('');
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
      this.agregarDetalle(this.productoSeleccionado);
      this.productoSeleccionado = '';
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

  emitirComprobante(): void {
    this.errorVenta = '';
    this.mensajeVenta = '';
    if (!this.detalles.length) {
      this.errorVenta = 'Agrega al menos un producto para registrar la venta.';
      return;
    }

    const detallesValidos = this.detalles
      .filter((item) => !!item.descripcion.trim() && (item.cantidad ?? 0) > 0)
      .map((item) => ({
        descripcion: item.descripcion.trim(),
        unidad: item.unidad,
        cantidad: Number(item.cantidad ?? 0),
        precio_unitario: Number(item.precioUnitario ?? 0)
      }));

    if (!detallesValidos.length) {
      this.errorVenta = 'Verifica el detalle de la venta. Debe tener descripción y cantidad.';
      return;
    }

    const payload = {
      tipo_comprobante: this.tipoComprobante,
      serie: this.serie,
      numero: this.numero,
      fecha_emision: this.fechaEmision,
      moneda: this.moneda,
      forma_pago: this.formaPago,
      metodo_pago: this.metodoPagoSeleccionado,
      cliente_tipo_documento: this.tipoDocumentoCliente,
      cliente_documento: this.cliente.documento,
      cliente_nombre: this.cliente.nombre,
      cliente_direccion: this.cliente.direccion,
      subtotal: this.subtotal,
      total: this.total,
      monto_recibido: this.montoRecibido,
      vuelto: this.vuelto,
      referencia_serie: this.referenciaSerie,
      referencia_numero: this.referenciaNumero,
      referencia_motivo: this.referenciaMotivo,
      detalles: detallesValidos
    };

    this.guardandoVenta = true;
    this.http.post<VentaGuardada>('/api/ventas', payload, { headers: this.obtenerHeaders() }).subscribe({
      next: (venta) => {
        this.guardandoVenta = false;
        this.mensajeVenta = 'Venta registrada correctamente.';
        this.ultimaVentaEmitida = venta;
        this.mostrarModalVoucher = true;
        this.limpiarFormularioVenta();
      },
      error: (err) => {
        this.guardandoVenta = false;
        this.errorVenta = err?.error?.message ?? 'No se pudo guardar la venta. Inténtalo nuevamente.';
      }
    });
  }

  imprimirVoucher(): void {
    this.abrirComprobante('print');
  }

  descargarVoucher(): void {
    this.abrirComprobante('download');
  }

  descargarXmlVoucher(): void {
    this.abrirXmlComprobante();
  }

  enviarVoucher(): void {
    if (!this.ultimaVentaEmitida) {
      return;
    }

    this.obtenerPdfBlob(this.ultimaVentaEmitida.comprobante_venta_id).subscribe({
      next: async (blob) => {
        const archivo = new File([blob], `comprobante-${this.ultimaVentaEmitida?.serie}-${this.ultimaVentaEmitida?.numero}.pdf`, {
          type: 'application/pdf'
        });

        if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
          await navigator.share({
            title: 'Comprobante de venta',
            text: 'Adjunto el comprobante de venta en PDF.',
            files: [archivo]
          });
          return;
        }

        this.errorVenta = 'Tu navegador no soporta el envío directo. Usa Descargar PDF.';
      },
      error: () => {
        this.errorVenta = 'No se pudo generar el voucher para enviar.';
      }
    });
  }

  cerrarModalVoucher(): void {
    this.mostrarModalVoucher = false;
  }

  private limpiarFormularioVenta(): void {
    this.tipoComprobante = 'factura';
    this.actualizarSerieNumero();
    this.fechaEmision = new Date().toISOString().split('T')[0];
    this.moneda = 'PEN';
    this.formaPago = 'Contado';
    this.tipoDocumentoCliente = 'ruc';
    this.consultaDocumento = '';
    this.cliente = {
      documento: '',
      nombre: '',
      direccion: ''
    };
    this.referenciaSerie = '';
    this.referenciaNumero = '';
    this.referenciaMotivo = '';
    this.detalles = [];
    this.productoSeleccionado = '';
    this.metodoPagoSeleccionado = 'efectivo';
    this.montoRecibido = null;
  }

  private abrirComprobante(modo: 'print' | 'download'): void {
    if (!this.ultimaVentaEmitida) {
      return;
    }

    this.obtenerPdfBlob(this.ultimaVentaEmitida.comprobante_venta_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (modo === 'print') {
          const ventana = window.open(url, '_blank');
          if (ventana) {
            ventana.onload = () => ventana.print();
          }
          return;
        }

        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante-${this.ultimaVentaEmitida?.serie}-${this.ultimaVentaEmitida?.numero}.pdf`;
        enlace.click();
      },
      error: () => {
        this.errorVenta = 'No se pudo generar el voucher en PDF.';
      }
    });
  }

  private obtenerPdfBlob(ventaId: number) {
    return this.http.get(this.obtenerUrlPdf(ventaId), {
      headers: this.obtenerHeaders(),
      responseType: 'blob'
    });
  }

  private obtenerUrlPdf(ventaId: number): string {
    return `/api/ventas/${ventaId}/pdf?formato=${this.formatoVoucher}`;
  }


  private abrirXmlComprobante(): void {
    if (!this.ultimaVentaEmitida) {
      return;
    }

    this.obtenerXmlBlob(this.ultimaVentaEmitida.comprobante_venta_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante-${this.ultimaVentaEmitida?.serie}-${this.ultimaVentaEmitida?.numero}.xml`;
        enlace.click();
      },
      error: () => {
        this.errorVenta = 'No se pudo generar el XML del comprobante.';
      }
    });
  }

  private obtenerXmlBlob(ventaId: number) {
    return this.http.get(this.obtenerUrlXml(ventaId), {
      headers: this.obtenerHeaders(),
      responseType: 'blob'
    });
  }

  private obtenerUrlXml(ventaId: number): string {
    return `/api/ventas/${ventaId}/xml`;
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
