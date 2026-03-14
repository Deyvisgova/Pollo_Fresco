import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../servicios/sesion.servicio';

interface PedidoCliente {
  cliente_id: number;
  dni: string | null;
  nombres: string;
  apellidos: string | null;
  celular: string | null;
  direccion: string | null;
}

interface PedidoDetalle {
  producto_id: number;
  cantidad: number;
  peso_kg: number | null;
  precio_unitario: number;
}

type EstadoPago = 'COMPLETO' | 'PENDIENTE' | 'PARCIAL';

interface PedidoPago {
  pedido_pago_id: number;
  estado_pago: EstadoPago;
  pago_parcial: number | null;
  vuelto: number;
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
  detalles: PedidoDetalle[];
  pagos: PedidoPago[];
}

interface FormularioDetalle {
  producto_id: number;
  cantidad: number;
  peso_kg: number | null;
  precio_unitario: number;
}

interface ClienteRapido {
  nombres: string;
  apellidos: string;
  dni: string;
  celular: string;
  direccion: string;
}

@Component({
  selector: 'app-privado-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class PrivadoPedidos implements OnInit {
  vista: 'vendedor' | 'delivery' = 'vendedor';

  pedidos: PedidoDelivery[] = [];
  pedidosFiltrados: PedidoDelivery[] = [];
  pedidoSeleccionado: PedidoDelivery | null = null;

  // Cliente en formulario del vendedor
  terminoCliente = '';
  clientesSugeridos: PedidoCliente[] = [];
  clienteSeleccionado: PedidoCliente | null = null;

  // Modal para registrar cliente rápido desde pedidos
  mostrarModalCliente = false;
  guardandoClienteRapido = false;
  clienteRapido: ClienteRapido = this.crearClienteRapido();

  // Formulario principal del pedido
  deliveryUsuarioId: number | null = null;
  fechaHoraCreacion = '';
  detalles: FormularioDetalle[] = [this.crearDetalleVacio()];

  // Estado, pagos y ubicación (vista delivery)
  estadoDestino: 2 | 3 = 2;
  motivoCancelacion = '';
  estadoPago: EstadoPago = 'PENDIENTE';
  pagoParcial: number | null = null;
  montoRecibido: number | null = null;
  latitud: number | null = null;
  longitud: number | null = null;
  fotoFrontisUrl = '';

  // Estado UI
  cargando = false;
  guardandoPedido = false;
  guardandoEstado = false;
  registrandoPago = false;
  guardandoUbicacion = false;
  mensajeError = '';
  filtro = '';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.fechaHoraCreacion = this.fechaActualIsoLocal();
    this.cargarPedidos();
  }

  cambiarVista(vista: 'vendedor' | 'delivery'): void {
    this.vista = vista;
    this.pedidoSeleccionado = null;
    this.mensajeError = '';
    this.cargarPedidos();
  }

  // ---------------------------
  // Carga principal de pedidos
  // ---------------------------
  cargarPedidos(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.http.get<PedidoDelivery[]>(`/api/pedidos-delivery?rol=${this.vista}`, { headers: this.obtenerHeaders() }).subscribe({
      next: (pedidos) => {
        this.pedidos = pedidos;
        this.aplicarFiltro();
        this.cargando = false;

        if (this.pedidoSeleccionado) {
          this.pedidoSeleccionado = this.pedidos.find((p) => p.pedido_id === this.pedidoSeleccionado?.pedido_id) ?? null;
        }
      },
      error: (error) => {
        this.cargando = false;
        this.pedidos = [];
        this.pedidosFiltrados = [];
        this.mensajeError = this.extraerError(error, 'No se pudo cargar pedidos delivery.');
      }
    });
  }

  aplicarFiltro(): void {
    const termino = this.filtro.trim().toLowerCase();

    if (!termino) {
      this.pedidosFiltrados = [...this.pedidos];
      return;
    }

    this.pedidosFiltrados = this.pedidos.filter((pedido) => {
      const nombre = `${pedido.cliente?.nombres ?? ''} ${pedido.cliente?.apellidos ?? ''}`.toLowerCase();
      const dni = (pedido.cliente?.dni ?? '').toLowerCase();
      const direccion = (pedido.cliente?.direccion ?? '').toLowerCase();
      return `${pedido.pedido_id}`.includes(termino) || nombre.includes(termino) || dni.includes(termino) || direccion.includes(termino);
    });
  }

  // ---------------------------------------------
  // Cliente por búsqueda (nombre o DNI) + modal
  // ---------------------------------------------
  buscarClientes(): void {
    const termino = this.terminoCliente.trim();

    if (!termino) {
      this.clientesSugeridos = [];
      return;
    }

    this.http
      .get<PedidoCliente[]>(`/api/clientes?search=${encodeURIComponent(termino)}`, { headers: this.obtenerHeaders() })
      .subscribe({
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

  limpiarClienteSeleccionado(): void {
    this.clienteSeleccionado = null;
    this.terminoCliente = '';
    this.clientesSugeridos = [];
  }

  abrirModalCliente(): void {
    this.mostrarModalCliente = true;
    this.clienteRapido = this.crearClienteRapido();
  }

  cerrarModalCliente(): void {
    this.mostrarModalCliente = false;
    this.guardandoClienteRapido = false;
  }

  guardarClienteRapido(): void {
    this.guardandoClienteRapido = true;
    this.mensajeError = '';

    const payload = {
      nombres: this.clienteRapido.nombres,
      apellidos: this.clienteRapido.apellidos || null,
      dni: this.clienteRapido.dni || null,
      celular: this.clienteRapido.celular || null,
      direccion: this.clienteRapido.direccion || null
    };

    this.http.post<PedidoCliente>('/api/clientes', payload, { headers: this.obtenerHeaders() }).subscribe({
      next: (cliente) => {
        this.guardandoClienteRapido = false;
        this.cerrarModalCliente();
        this.seleccionarCliente(cliente);
      },
      error: (error) => {
        this.guardandoClienteRapido = false;
        this.mensajeError = this.extraerError(error, 'No se pudo registrar el cliente.');
      }
    });
  }

  // ---------------------------------
  // Detalle de productos (estilo venta)
  // ---------------------------------
  crearDetalleVacio(): FormularioDetalle {
    return {
      producto_id: 0,
      cantidad: 1,
      peso_kg: null,
      precio_unitario: 0
    };
  }

  agregarLineaDetalle(): void {
    this.detalles.push(this.crearDetalleVacio());
  }

  eliminarLineaDetalle(index: number): void {
    if (this.detalles.length === 1) {
      return;
    }
    this.detalles.splice(index, 1);
  }

  totalDetalle(item: FormularioDetalle): number {
    return Number(((item.cantidad || 0) * (item.precio_unitario || 0)).toFixed(2));
  }

  totalFormulario(): number {
    return this.detalles.reduce((acc, item) => acc + this.totalDetalle(item), 0);
  }

  guardarPedido(): void {
    if (!this.clienteSeleccionado) {
      this.mensajeError = 'Primero selecciona un cliente desde la búsqueda o regístralo en el modal.';
      return;
    }

    const detallesValidos = this.detalles.filter((item) => item.producto_id > 0 && item.cantidad > 0 && item.precio_unitario >= 0);

    if (!detallesValidos.length) {
      this.mensajeError = 'Agrega al menos un producto válido en el detalle.';
      return;
    }

    this.guardandoPedido = true;
    this.mensajeError = '';

    const payload = {
      cliente_id: this.clienteSeleccionado.cliente_id,
      delivery_usuario_id: this.deliveryUsuarioId,
      fecha_hora_creacion: this.fechaHoraCreacion,
      detalles: detallesValidos
    };

    this.http.post('/api/pedidos-delivery', payload, { headers: this.obtenerHeaders() }).subscribe({
      next: () => {
        this.guardandoPedido = false;
        this.reiniciarFormularioPedido();
        this.cargarPedidos();
      },
      error: (error) => {
        this.guardandoPedido = false;
        this.mensajeError = this.extraerError(error, 'No se pudo registrar el pedido.');
      }
    });
  }

  // ---------------------------------
  // Acciones del delivery
  // ---------------------------------
  seleccionarPedido(pedido: PedidoDelivery): void {
    this.pedidoSeleccionado = pedido;
    this.estadoDestino = pedido.estado_id === 3 ? 3 : 2;
    this.motivoCancelacion = pedido.motivo_cancelacion ?? '';
    this.estadoPago = 'PENDIENTE';
    this.pagoParcial = null;
    this.montoRecibido = null;
    this.latitud = pedido.latitud;
    this.longitud = pedido.longitud;
    this.fotoFrontisUrl = pedido.foto_frontis_url ?? '';
  }

  actualizarEstadoPedido(): void {
    if (!this.pedidoSeleccionado) {
      return;
    }

    this.guardandoEstado = true;

    this.http
      .patch(
        `/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/estado`,
        {
          estado_id: this.estadoDestino,
          motivo_cancelacion: this.estadoDestino === 3 ? this.motivoCancelacion : null
        },
        { headers: this.obtenerHeaders() }
      )
      .subscribe({
        next: () => {
          this.guardandoEstado = false;
          this.cargarPedidos();
        },
        error: (error) => {
          this.guardandoEstado = false;
          this.mensajeError = this.extraerError(error, 'No se pudo actualizar estado del pedido.');
        }
      });
  }

  registrarPagoPedido(): void {
    if (!this.pedidoSeleccionado) {
      return;
    }

    this.registrandoPago = true;

    this.http
      .post(
        `/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/pagos`,
        {
          estado_pago: this.estadoPago,
          pago_parcial: this.estadoPago === 'PARCIAL' ? this.pagoParcial : null,
          monto_recibido: this.montoRecibido
        },
        { headers: this.obtenerHeaders() }
      )
      .subscribe({
        next: () => {
          this.registrandoPago = false;
          this.cargarPedidos();
        },
        error: (error) => {
          this.registrandoPago = false;
          this.mensajeError = this.extraerError(error, 'No se pudo registrar el pago.');
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
        {
          latitud: this.latitud,
          longitud: this.longitud,
          foto_frontis_url: this.fotoFrontisUrl || null
        },
        { headers: this.obtenerHeaders() }
      )
      .subscribe({
        next: () => {
          this.guardandoUbicacion = false;
          this.cargarPedidos();
        },
        error: (error) => {
          this.guardandoUbicacion = false;
          this.mensajeError = this.extraerError(error, 'No se pudo guardar ubicación/evidencia.');
        }
      });
  }

  // ---------------------------------
  // Comunicación cliente
  // ---------------------------------
  abrirWhatsapp(pedido: PedidoDelivery): void {
    const numero = this.normalizarNumero(pedido.cliente?.celular ?? '');
    if (!numero) {
      return;
    }
    const mensaje = encodeURIComponent(`Hola, tu pedido #${pedido.pedido_id} está en ruta.`);
    window.open(`https://wa.me/51${numero}?text=${mensaje}`, '_blank');
  }

  llamarCliente(pedido: PedidoDelivery): void {
    const numero = this.normalizarNumero(pedido.cliente?.celular ?? '');
    if (!numero) {
      return;
    }
    window.location.href = `tel:+51${numero}`;
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

  private reiniciarFormularioPedido(): void {
    this.deliveryUsuarioId = null;
    this.fechaHoraCreacion = this.fechaActualIsoLocal();
    this.detalles = [this.crearDetalleVacio()];
    this.limpiarClienteSeleccionado();
  }

  private crearClienteRapido(): ClienteRapido {
    return {
      nombres: '',
      apellidos: '',
      dni: '',
      celular: '',
      direccion: ''
    };
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

  private normalizarNumero(numero: string): string {
    const limpio = (numero || '').replace(/\D/g, '');
    return limpio.length === 9 ? limpio : '';
  }
}
