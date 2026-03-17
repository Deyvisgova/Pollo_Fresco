import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../servicios/sesion.servicio';

interface PedidoCliente {
  cliente_id: number;
  dni: string | null;
  ruc: string | null;
  nombres: string;
  apellidos: string | null;
  nombre_empresa: string | null;
  celular: string | null;
  direccion: string | null;
  direccion_fiscal: string | null;
  referencias: string | null;
}

interface PedidoDetalleApi {
  cantidad: number;
  unidad: string;
  descripcion: string;
  precio_unitario: number;
  subtotal: number;
}

interface PedidoPago {
  pedido_pago_id: number;
  estado_pago: 'COMPLETO' | 'PENDIENTE' | 'PARCIAL';
  pago_parcial: number | null;
  vuelto: number;
  fecha_hora: string | null;
}

interface PedidoDelivery {
  pedido_id: number;
  estado_id: 1 | 2 | 3;
  fecha_hora_creacion: string;
  motivo_cancelacion: string | null;
  latitud: number | null;
  longitud: number | null;
  foto_frontis_url: string | null;
  total: number;
  cliente: PedidoCliente;
  detalles: PedidoDetalleApi[];
  pagos: PedidoPago[];
}

interface DetalleFormulario {
  cantidad: number;
  unidad: 'KG' | 'UND';
  descripcion: string;
  precioUnitario: number;
}

interface ClienteFormulario {
  cliente_id: number | null;
  dni: string;
  ruc: string;
  nombres: string;
  apellidos: string;
  nombreEmpresa: string;
  celular: string;
  direccion: string;
  direccionFiscal: string;
  referencias: string;
}

interface ProductoApi {
  id: number;
  nombre: string;
}

interface LoteApi {
  producto_id: number;
  cantidad: number;
  estado: 'ABIERTO' | 'CERRADO';
}

@Component({
  selector: 'app-privado-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class PrivadoPedidos implements OnInit {
  private token = 'f3ba6fa1f3a2b2d1a6390dc06d831ebad2f218a9d3ba43e7f1f42b425dd03e26';

  subpaginaActiva: 'registrar' | 'registros' | 'delivery' = 'registrar';
  private solicitudPedidosId = 0;

  pedidos: PedidoDelivery[] = [];
  pedidosFiltrados: PedidoDelivery[] = [];
  pedidoSeleccionado: PedidoDelivery | null = null;

  terminoCliente = '';
  clientesSugeridos: PedidoCliente[] = [];
  clienteSeleccionado: PedidoCliente | null = null;

  fechaHoraCreacion = '';
  detalles: DetalleFormulario[] = [this.crearDetalleVacio()];
  productoSeleccionado = '';
  productosDisponibles: ProductoApi[] = [];
  productosFiltrados: string[] = [];
  stockDisponiblePorProducto = new Map<number, number>();
  indiceFilaPreferida: number | null = 0;

  mostrarModalCliente = false;
  consultaDocumento = '';
  consultaCargando = false;
  guardandoCliente = false;
  formularioCliente: ClienteFormulario = this.crearFormularioCliente();

  estadoDestino: 2 | 3 = 2;
  motivoCancelacion = '';
  estadoPago: 'COMPLETO' | 'PENDIENTE' | 'PARCIAL' = 'PENDIENTE';
  pagoParcial: number | null = null;
  montoRecibido: number | null = null;
  latitud: number | null = null;
  longitud: number | null = null;
  fotoFrontisUrl = '';

  cargando = false;
  guardandoPedido = false;
  guardandoEstado = false;
  registrandoPago = false;
  guardandoGestion = false;
  guardandoUbicacion = false;
  mensajeError = '';
  filtro = '';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.fechaHoraCreacion = this.fechaActualIsoLocal();
    this.cargarPedidos('vendedor');
    this.cargarProductos();
    this.cargarStockDisponible();
  }

  cambiarSubpagina(subpagina: 'registrar' | 'registros' | 'delivery'): void {
    this.subpaginaActiva = subpagina;
    this.pedidoSeleccionado = null;

    if (subpagina === 'registros') {
      this.cargarPedidos('vendedor');
      return;
    }

    if (subpagina === 'delivery') {
      this.cargarPedidos('delivery');
    }
  }

  cargarPedidos(rol: 'vendedor' | 'delivery'): void {
    const solicitudActual = ++this.solicitudPedidosId;
    this.cargando = true;
    this.http.get<PedidoDelivery[]>(`/api/pedidos-delivery?rol=${rol}`, { headers: this.obtenerHeaders() }).subscribe({
      next: (pedidos) => {
        if (solicitudActual !== this.solicitudPedidosId) {
          return;
        }
        this.pedidos = pedidos;
        this.aplicarFiltro();
        this.cargando = false;
      },
      error: (error) => {
        if (solicitudActual !== this.solicitudPedidosId) {
          return;
        }
        this.pedidos = [];
        this.pedidosFiltrados = [];
        this.cargando = false;
        this.mensajeError = this.extraerError(error, 'No se pudo cargar pedidos.');
      }
    });
  }

  aplicarFiltro(): void {
    const pedidosBase = this.subpaginaActiva === 'delivery'
      ? this.pedidos.filter((pedido) => this.esPedidoDelDiaActual(pedido.fecha_hora_creacion))
      : [...this.pedidos];

    const termino = this.filtro.trim().toLowerCase();
    if (!termino) {
      this.pedidosFiltrados = pedidosBase;
      return;
    }

    this.pedidosFiltrados = pedidosBase.filter((pedido) => {
      const nombre = `${pedido.cliente?.nombres ?? ''} ${pedido.cliente?.apellidos ?? ''}`.toLowerCase();
      const dni = (pedido.cliente?.dni ?? '').toLowerCase();
      return `${pedido.pedido_id}`.includes(termino) || nombre.includes(termino) || dni.includes(termino);
    });
  }

  buscarClientes(): void {
    const termino = this.terminoCliente.trim();
    if (!termino) {
      this.clientesSugeridos = [];
      return;
    }

    this.http.get<PedidoCliente[]>(`/api/clientes?search=${encodeURIComponent(termino)}`, { headers: this.obtenerHeaders() }).subscribe({
      next: (clientes) => {
        this.clientesSugeridos = clientes.slice(0, 6);
      },
      error: () => {
        this.clientesSugeridos = [];
      }
    });
  }

  seleccionarCliente(cliente: PedidoCliente): void {
    this.clienteSeleccionado = cliente;
    this.terminoCliente = `${cliente.nombres} ${cliente.apellidos ?? ''}`.trim();
    this.clientesSugeridos = [];
  }

  abrirModalCliente(): void {
    this.formularioCliente = this.crearFormularioCliente();
    this.consultaDocumento = '';
    this.mostrarModalCliente = true;
  }

  cerrarModalCliente(): void {
    this.mostrarModalCliente = false;
    this.consultaCargando = false;
    this.guardandoCliente = false;
  }

  consultarDocumentoApi(): void {
    this.mensajeError = '';
    const documento = this.consultaDocumento.trim();

    if (!/^\d+$/.test(documento)) {
      this.mensajeError = 'El documento solo debe contener dígitos.';
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

    this.mensajeError = 'El documento debe tener 8 (DNI) u 11 (RUC) dígitos.';
  }

  guardarClienteDesdeModal(): void {
    this.guardandoCliente = true;

    const payload = {
      dni: this.formularioCliente.dni || null,
      ruc: this.formularioCliente.ruc || null,
      nombres: this.formularioCliente.nombres || '',
      apellidos: this.formularioCliente.apellidos || '',
      nombre_empresa: this.formularioCliente.nombreEmpresa || '',
      celular: this.formularioCliente.celular || '',
      direccion: this.formularioCliente.direccion || '',
      direccion_fiscal: this.formularioCliente.direccionFiscal || '',
      referencias: this.formularioCliente.referencias || ''
    };

    this.http.post<PedidoCliente>('/api/clientes', payload, { headers: this.obtenerHeaders() }).subscribe({
      next: (cliente) => {
        this.guardandoCliente = false;
        this.seleccionarCliente(cliente);
        this.cerrarModalCliente();
      },
      error: (error) => {
        this.guardandoCliente = false;
        this.mensajeError = this.extraerError(error, 'No se pudo guardar el cliente.');
      }
    });
  }

  limpiarFormularioCliente(): void {
    this.consultaDocumento = '';
    this.formularioCliente = this.crearFormularioCliente();
  }

  actualizarBusquedaProductos(): void {
    const termino = this.productoSeleccionado.trim().toLowerCase();
    if (!termino) {
      this.productosFiltrados = [];
      return;
    }

    this.productosFiltrados = this.productosDisponibles
      .map((producto) => producto.nombre)
      .filter((nombre) => nombre.toLowerCase().includes(termino));
  }

  seleccionarProductoDesdeBuscador(): void {
    const nombre = this.productoSeleccionado.trim();
    if (!nombre) {
      return;
    }

    const producto = this.productosDisponibles.find((item) => item.nombre.toLowerCase() === nombre.toLowerCase());
    if (!producto) {
      return;
    }

    const stockDisponible = this.stockDisponiblePorProducto.get(producto.id) ?? 0;
    if (stockDisponible <= 0) {
      this.mostrarAlertaStockSinDisponibilidad(producto.nombre);
      this.productoSeleccionado = '';
      this.productosFiltrados = [];
      return;
    }

    const indiceFilaObjetivo = this.resolverFilaObjetivoParaProducto();
    if (indiceFilaObjetivo >= 0) {
      this.detalles[indiceFilaObjetivo].descripcion = producto.nombre;
      this.indiceFilaPreferida = null;
    } else {
      this.agregarLineaDetalle(producto.nombre);
    }

    this.productoSeleccionado = '';
    this.productosFiltrados = [];
  }

  agregarLineaDetalle(descripcion = ''): void {
    this.detalles.push({
      cantidad: 1,
      unidad: 'KG',
      descripcion,
      precioUnitario: 0
    });

    if (!descripcion) {
      this.indiceFilaPreferida = this.detalles.length - 1;
    }
  }

  eliminarLineaDetalle(index: number): void {
    if (this.detalles.length === 1) {
      return;
    }
    this.detalles.splice(index, 1);
  }


  private resolverFilaObjetivoParaProducto(): number {
    if (this.indiceFilaPreferida !== null && this.indiceFilaPreferida >= 0) {
      const filaPreferida = this.detalles[this.indiceFilaPreferida];
      if (filaPreferida && !filaPreferida.descripcion.trim()) {
        return this.indiceFilaPreferida;
      }
    }

    return this.detalles.findIndex((item) => !item.descripcion.trim());
  }

  validarCantidadPorStock(index: number): void {
    const fila = this.detalles[index];
    if (!fila) {
      return;
    }

    const cantidad = Number(fila.cantidad ?? 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return;
    }

    const producto = this.productosDisponibles.find(
      (item) => item.nombre.trim().toLowerCase() === fila.descripcion.trim().toLowerCase()
    );

    if (!producto) {
      return;
    }

    const stockDisponible = this.stockDisponiblePorProducto.get(producto.id) ?? 0;
    if (cantidad > stockDisponible) {
      fila.cantidad = 0;
      this.mostrarAlertaCantidadMayorStock(producto.nombre, stockDisponible);
    }
  }

  totalDetalle(item: DetalleFormulario): number {
    return Number(((item.cantidad || 0) * (item.precioUnitario || 0)).toFixed(2));
  }

  totalPedido(): number {
    return this.detalles.reduce((acc, item) => acc + this.totalDetalle(item), 0);
  }

  guardarPedido(): void {
    if (!this.clienteSeleccionado) {
      this.mensajeError = 'Selecciona un cliente antes de registrar el pedido.';
      return;
    }

    const detallesValidos = this.detalles.filter((item) => item.descripcion.trim() && item.cantidad > 0 && item.precioUnitario >= 0);

    if (!detallesValidos.length) {
      this.mensajeError = 'Agrega al menos una línea válida en el detalle.';
      return;
    }

    this.guardandoPedido = true;
    this.mensajeError = '';

    const payload = {
      cliente_id: this.clienteSeleccionado.cliente_id,
      fecha_hora_creacion: this.fechaHoraCreacion,
      detalles: detallesValidos.map((item) => ({
        cantidad: item.cantidad,
        unidad: item.unidad,
        descripcion: item.descripcion,
        precio_unitario: item.precioUnitario
      }))
    };

    this.http.post('/api/pedidos-delivery', payload, { headers: this.obtenerHeaders() }).subscribe({
      next: () => {
        this.enviarFilasAVentasDiarias(detallesValidos);
        this.guardandoPedido = false;
        this.reiniciarFormularioPedido();
        this.cargarPedidos('vendedor');
      },
      error: (error) => {
        this.guardandoPedido = false;
        this.mensajeError = this.extraerError(error, 'No se pudo guardar el pedido.');
      }
    });
  }

  seleccionarPedido(pedido: PedidoDelivery): void {
    this.pedidoSeleccionado = pedido;
    this.estadoDestino = pedido.estado_id === 3 ? 3 : 2;
    this.motivoCancelacion = pedido.motivo_cancelacion ?? '';
    const ultimoPago = this.obtenerUltimoPago(pedido);
    this.estadoPago = ultimoPago?.estado_pago ?? 'PENDIENTE';
    this.pagoParcial = ultimoPago?.pago_parcial ?? null;
    this.montoRecibido = ultimoPago?.estado_pago === 'COMPLETO' ? Number(pedido.total) : ultimoPago?.pago_parcial ?? null;
    this.latitud = pedido.latitud;
    this.longitud = pedido.longitud;
    this.fotoFrontisUrl = pedido.foto_frontis_url ?? '';
  }

  cerrarModalGestion(): void {
    this.pedidoSeleccionado = null;
  }

  guardarEstadoYPago(): void {
    if (!this.pedidoSeleccionado) {
      return;
    }

    if (this.estadoPago === 'PARCIAL' && (this.pagoParcial === null || Number(this.pagoParcial) <= 0)) {
      this.mensajeError = 'En pago parcial debes ingresar un monto mayor a 0.';
      return;
    }

    this.guardandoGestion = true;

    this.http
      .patch(
        `/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/gestion`,
        {
          estado_id: this.estadoDestino,
          motivo_cancelacion: this.estadoDestino === 3 ? this.motivoCancelacion : null,
          estado_pago: this.estadoPago,
          monto_recibido: this.estadoPago === 'PARCIAL' ? null : this.montoRecibido,
          pago_parcial: this.estadoPago === 'PARCIAL' ? this.pagoParcial : this.montoRecibido
        },
        { headers: this.obtenerHeaders() }
      )
      .subscribe({
        next: (pedidoActualizado) => {
          this.guardandoGestion = false;
          this.pedidoSeleccionado = pedidoActualizado as PedidoDelivery;
          this.cargarPedidos('delivery');
        },
        error: (error) => {
          this.guardandoGestion = false;
          this.mensajeError = this.extraerError(error, 'No se pudo guardar el estado y pago.');
        }
      });
  }

  guardarUbicacionEvidencia(): void {
    if (!this.pedidoSeleccionado) {
      return;
    }

    this.guardandoUbicacion = true;

    this.http
      .patch(
        `/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/ubicacion-evidencia`,
        { latitud: this.latitud, longitud: this.longitud, foto_frontis_url: this.fotoFrontisUrl || null },
        { headers: this.obtenerHeaders() }
      )
      .subscribe({
        next: () => {
          this.guardandoUbicacion = false;
          this.cargarPedidos('delivery');
        },
        error: (error) => {
          this.guardandoUbicacion = false;
          this.mensajeError = this.extraerError(error, 'No se pudo guardar la evidencia.');
        }
      });
  }

  abrirWhatsapp(pedido: PedidoDelivery): void {
    const numero = this.normalizarNumero(pedido.cliente?.celular ?? '');
    if (!numero) {
      return;
    }
    window.open(`https://wa.me/51${numero}?text=${encodeURIComponent(`Hola, tu pedido #${pedido.pedido_id} está en ruta.`)}`, '_blank');
  }

  llamarCliente(pedido: PedidoDelivery): void {
    const numero = this.normalizarNumero(pedido.cliente?.celular ?? '');
    if (!numero) {
      return;
    }
    window.location.href = `tel:+51${numero}`;
  }

  abrirUbicacionPedido(pedido: PedidoDelivery): void {
    const latitud = Number(pedido.latitud ?? 0);
    const longitud = Number(pedido.longitud ?? 0);

    if (Number.isFinite(latitud) && Number.isFinite(longitud) && (latitud !== 0 || longitud !== 0)) {
      window.open(`https://www.google.com/maps?q=${latitud},${longitud}`, '_blank');
      return;
    }

    const direccion = pedido.cliente?.direccion || pedido.cliente?.direccion_fiscal;
    if (direccion) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`, '_blank');
      return;
    }

    this.mensajeError = 'Este pedido no tiene ubicación registrada aún.';
  }

  verFotoFrontis(pedido: PedidoDelivery): void {
    if (!pedido.foto_frontis_url) {
      this.mensajeError = 'Este pedido no tiene foto de frontis registrada aún.';
      return;
    }

    window.open(pedido.foto_frontis_url, '_blank');
  }

  obtenerEtiquetaEstado(estadoId: number): string {
    if (estadoId === 2) {
      return 'ENTREGADO';
    }
    if (estadoId === 3) {
      return 'CANCELADO';
    }
    return 'PENDIENTE';
  }

  obtenerEtiquetaEstadoPago(pedido: PedidoDelivery): string {
    const estado = this.obtenerUltimoPago(pedido)?.estado_pago;
    return estado ?? 'SIN REGISTRO';
  }

  obtenerDetalleEstadoPago(pedido: PedidoDelivery): string {
    const ultimoPago = this.obtenerUltimoPago(pedido);
    if (!ultimoPago) {
      return '';
    }

    const montoParcial = Number(ultimoPago.pago_parcial ?? 0);
    const total = Number(pedido.total ?? 0);

    if (ultimoPago.estado_pago === 'PARCIAL') {
      const saldo = Math.max(0, Number((total - montoParcial).toFixed(2)));
      return `Pagó S/ ${montoParcial.toFixed(2)} · Debe S/ ${saldo.toFixed(2)}`;
    }

    if (ultimoPago.estado_pago === 'COMPLETO' && Number(ultimoPago.vuelto ?? 0) > 0) {
      return `Vuelto: S/ ${Number(ultimoPago.vuelto).toFixed(2)}`;
    }

    if (ultimoPago.estado_pago === 'PENDIENTE') {
      return `Debe S/ ${total.toFixed(2)}`;
    }

    return '';
  }

  obtenerFechaPago(pedido: PedidoDelivery | null): string | null {
    if (!pedido) {
      return null;
    }
    return this.obtenerUltimoPago(pedido)?.fecha_hora ?? null;
  }

  calcularVuelto(): number {
    if (!this.pedidoSeleccionado || this.estadoPago !== 'COMPLETO') {
      return 0;
    }

    const monto = Number(this.montoRecibido ?? 0);
    return Math.max(0, Number((monto - this.pedidoSeleccionado.total).toFixed(2)));
  }

  calcularSaldoPendiente(): number {
    if (!this.pedidoSeleccionado || this.estadoPago !== 'PARCIAL') {
      return 0;
    }

    const parcial = Number(this.pagoParcial ?? 0);
    return Math.max(0, Number((this.pedidoSeleccionado.total - parcial).toFixed(2)));
  }

  private cargarProductos(search = ''): void {
    let params = new HttpParams();
    if (search.trim()) {
      params = params.set('buscar', search.trim());
    }

    this.http.get<ProductoApi[]>('/api/otros-productos/productos', { headers: this.obtenerHeaders(), params }).subscribe({
      next: (productos) => {
        this.productosDisponibles = productos;
      },
      error: () => {
        this.productosDisponibles = [];
      }
    });
  }


  private cargarStockDisponible(): void {
    this.http.get<LoteApi[]>('/api/otros-productos/lotes', { headers: this.obtenerHeaders() }).subscribe({
      next: (lotes) => {
        const stockPorProducto = new Map<number, number>();
        lotes
          .filter((lote) => lote.estado === 'ABIERTO')
          .forEach((lote) => {
            const acumulado = stockPorProducto.get(lote.producto_id) ?? 0;
            stockPorProducto.set(lote.producto_id, acumulado + Number(lote.cantidad ?? 0));
          });

        this.stockDisponiblePorProducto = stockPorProducto;
      },
      error: () => {
        this.stockDisponiblePorProducto = new Map<number, number>();
      }
    });
  }

  private mostrarAlertaStockSinDisponibilidad(nombreProducto: string): void {
    const swal = (window as unknown as {
      Swal?: { fire: (options: Record<string, unknown>) => Promise<{ isConfirmed: boolean }> };
    }).Swal;

    if (!swal) {
      this.mensajeError = `No hay stock disponible para ${nombreProducto}.`;
      return;
    }

    void swal.fire({
      icon: 'warning',
      title: 'Stock insuficiente',
      text: `El producto ${nombreProducto} no tiene stock disponible en lotes abiertos.`,
      confirmButtonText: 'Entendido'
    });
  }

  private mostrarAlertaCantidadMayorStock(nombreProducto: string, stockDisponible: number): void {
    const swal = (window as unknown as {
      Swal?: { fire: (options: Record<string, unknown>) => Promise<{ isConfirmed: boolean }> };
    }).Swal;

    const mensaje = `La cantidad supera el stock disponible de ${nombreProducto} (${stockDisponible.toFixed(2)}).`;

    if (!swal) {
      this.mensajeError = mensaje;
      return;
    }

    void swal.fire({
      icon: 'warning',
      title: 'Cantidad inválida',
      text: mensaje,
      confirmButtonText: 'Entendido'
    });
  }



  /**
   * Envía en paralelo las filas del pedido al módulo de ventas diarias manuales.
   */
  private enviarFilasAVentasDiarias(detallesValidos: DetalleFormulario[]): void {
    const filas = detallesValidos
      .map((detalle) => {
        const producto = this.productosDisponibles.find(
          (item) => item.nombre.trim().toLowerCase() === detalle.descripcion.trim().toLowerCase()
        );

        if (!producto) {
          return null;
        }

        return {
          producto_id: producto.id,
          cantidad: Number(detalle.cantidad),
          precio: Number(detalle.precioUnitario),
          fecha_hora: this.formatearFechaHoraApi(this.fechaHoraCreacion)
        };
      })
      .filter((fila): fila is { producto_id: number; cantidad: number; precio: number; fecha_hora: string } => fila !== null);

    if (!filas.length) {
      return;
    }

    this.http
      .put('/api/otros-productos/ventas-diarias', {
        fecha: this.fechaHoraCreacion.slice(0, 10),
        filas
      }, { headers: this.obtenerHeaders() })
      .subscribe({
        error: () => {
          this.mensajeError = 'Pedido guardado, pero no se pudo enviar automáticamente a Ventas diarias.';
        }
      });
  }

  private formatearFechaHoraApi(valor: string): string {
    if (!valor) {
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    const base = valor.length === 16 ? `${valor}:00` : valor;
    return base.replace('T', ' ');
  }

  private consultarApi(endpoint: string, autocompletar: (data: Record<string, unknown>) => void): void {
    const url = `https://apiperu.dev/api/${endpoint}?api_token=${this.token}`;
    this.consultaCargando = true;

    this.http.get<{ data?: Record<string, unknown>; success?: boolean; message?: string }>(url).subscribe({
      next: (response) => {
        if (!response?.success || !response?.data) {
          this.mensajeError = response?.message || 'No se encontraron datos del documento.';
          return;
        }
        autocompletar(response.data);
      },
      error: () => {
        this.mensajeError = 'No se pudo consultar el documento en API externa.';
      },
      complete: () => {
        this.consultaCargando = false;
      }
    });
  }

  private autocompletarDesdeDni(data: Record<string, unknown>): void {
    this.formularioCliente.dni = String(data['numero'] ?? this.consultaDocumento);
    this.formularioCliente.nombres = String(data['nombres'] ?? '');
    this.formularioCliente.apellidos = `${String(data['apellido_paterno'] ?? '')} ${String(data['apellido_materno'] ?? '')}`.trim();
  }

  private autocompletarDesdeRuc(data: Record<string, unknown>): void {
    this.formularioCliente.ruc = String(data['ruc'] ?? this.consultaDocumento);
    this.formularioCliente.nombreEmpresa = String(data['nombre_o_razon_social'] ?? '');
    this.formularioCliente.direccion = String(data['direccion'] ?? '');
    this.formularioCliente.nombres = this.formularioCliente.nombres || this.formularioCliente.nombreEmpresa;
  }

  private crearDetalleVacio(): DetalleFormulario {
    return {
      cantidad: 1,
      unidad: 'KG',
      descripcion: '',
      precioUnitario: 0
    };
  }

  private crearFormularioCliente(): ClienteFormulario {
    return {
      cliente_id: null,
      dni: '',
      ruc: '',
      nombres: '',
      apellidos: '',
      nombreEmpresa: '',
      celular: '',
      direccion: '',
      direccionFiscal: '',
      referencias: ''
    };
  }

  private reiniciarFormularioPedido(): void {
    this.fechaHoraCreacion = this.fechaActualIsoLocal();
    this.detalles = [this.crearDetalleVacio()];
    this.terminoCliente = '';
    this.clienteSeleccionado = null;
    this.clientesSugeridos = [];
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private fechaActualIsoLocal(): string {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - offset).toISOString().slice(0, 16);
  }

  private extraerError(error: unknown, fallback: string): string {
    const errorApi = error as { error?: { message?: string; errors?: Record<string, string[]> } };
    const errores = errorApi?.error?.errors;
    if (errores) {
      const primerError = Object.values(errores)?.[0]?.[0];
      if (primerError) {
        return primerError;
      }
    }
    return errorApi?.error?.message ?? fallback;
  }

  private esPedidoDelDiaActual(fechaPedido: string): boolean {
    const fecha = new Date(fechaPedido);
    if (Number.isNaN(fecha.getTime())) {
      return false;
    }

    const hoy = new Date();
    return fecha.getFullYear() === hoy.getFullYear()
      && fecha.getMonth() === hoy.getMonth()
      && fecha.getDate() === hoy.getDate();
  }

  private obtenerUltimoPago(pedido: PedidoDelivery): PedidoPago | null {
    if (!pedido.pagos?.length) {
      return null;
    }

    return [...pedido.pagos].sort((a, b) => b.pedido_pago_id - a.pedido_pago_id)[0] ?? null;
  }

  private normalizarNumero(numero: string): string {
    const limpio = (numero || '').replace(/\D/g, '');
    return limpio.length === 9 ? limpio : '';
  }
}
