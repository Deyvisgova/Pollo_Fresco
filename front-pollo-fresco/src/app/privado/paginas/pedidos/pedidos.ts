import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../servicios/sesion.servicio';

interface PedidoCliente {
  cliente_id: number;
  nombres: string;
  apellidos: string | null;
  celular: string | null;
  direccion: string | null;
}

interface PedidoDetalle {
  pedido_detalle_id?: number;
  pedido_id?: number;
  producto_id: number;
  cantidad: number;
  peso_kg: number | null;
  precio_unitario: number;
  subtotal?: number;
}

type EstadoPago = 'COMPLETO' | 'PENDIENTE' | 'PARCIAL';

interface PedidoPago {
  pedido_pago_id: number;
  pedido_id: number;
  fecha_hora: string;
  estado_pago: EstadoPago;
  pago_parcial: number | null;
  vuelto: number;
}

interface PedidoDelivery {
  pedido_id: number;
  cliente_id: number;
  vendedor_usuario_id: number;
  delivery_usuario_id: number | null;
  estado_id: 1 | 2 | 3;
  fecha_hora_creacion: string;
  fecha_hora_entrega: string | null;
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

interface FormularioPedido {
  cliente_id: number | null;
  usarClienteNuevo: boolean;
  cliente_nuevo: {
    nombres: string;
    apellidos: string;
    celular: string;
    direccion: string;
  };
  delivery_usuario_id: number | null;
  fecha_hora_creacion: string;
  detalles: FormularioDetalle[];
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

  // Estados de UI
  cargando = false;
  guardandoPedido = false;
  registrandoPago = false;
  guardandoEstado = false;
  guardandoUbicacion = false;
  mensajeError = '';
  filtro = '';

  // Formulario de vendedor
  formulario: FormularioPedido = this.crearFormularioPedido();

  // Formulario de entrega/cancelación
  estadoDestino: 2 | 3 = 2;
  motivoCancelacion = '';

  // Formulario de pagos
  estadoPago: EstadoPago = 'PENDIENTE';
  pagoParcial: number | null = null;
  montoRecibido: number | null = null;

  // Formulario de ubicación y evidencia
  latitud: number | null = null;
  longitud: number | null = null;
  fotoFrontisUrl = '';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.formulario.fecha_hora_creacion = this.fechaActualIsoLocal();
    this.cargarPedidos();
  }

  cambiarVista(vista: 'vendedor' | 'delivery'): void {
    this.vista = vista;
    this.pedidoSeleccionado = null;
    this.mensajeError = '';
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.http
      .get<PedidoDelivery[]>(`/api/pedidos-delivery?rol=${this.vista}`, { headers: this.obtenerHeaders() })
      .subscribe({
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
          this.mensajeError = error?.error?.message ?? 'No se pudo cargar el módulo de pedidos delivery.';
        }
      });
  }

  agregarDetalle(): void {
    this.formulario.detalles.push({ producto_id: 0, cantidad: 1, peso_kg: null, precio_unitario: 0 });
  }

  quitarDetalle(index: number): void {
    if (this.formulario.detalles.length === 1) {
      return;
    }
    this.formulario.detalles.splice(index, 1);
  }

  guardarPedido(): void {
    this.guardandoPedido = true;
    this.mensajeError = '';

    const payload = {
      cliente_id: this.formulario.usarClienteNuevo ? null : this.formulario.cliente_id,
      cliente_nuevo: this.formulario.usarClienteNuevo
        ? {
            nombres: this.formulario.cliente_nuevo.nombres,
            apellidos: this.formulario.cliente_nuevo.apellidos || null,
            celular: this.formulario.cliente_nuevo.celular || null,
            direccion: this.formulario.cliente_nuevo.direccion || null
          }
        : null,
      delivery_usuario_id: this.formulario.delivery_usuario_id,
      fecha_hora_creacion: this.formulario.fecha_hora_creacion,
      detalles: this.formulario.detalles.map((detalle) => ({
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        peso_kg: detalle.peso_kg,
        precio_unitario: detalle.precio_unitario
      }))
    };

    this.http.post('/api/pedidos-delivery', payload, { headers: this.obtenerHeaders() }).subscribe({
      next: () => {
        this.guardandoPedido = false;
        this.formulario = this.crearFormularioPedido();
        this.formulario.fecha_hora_creacion = this.fechaActualIsoLocal();
        this.cargarPedidos();
      },
      error: (error) => {
        this.guardandoPedido = false;
        this.mensajeError = this.extraerError(error, 'No se pudo registrar el pedido.');
      }
    });
  }

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
    this.mensajeError = '';

    const payload = {
      estado_id: this.estadoDestino,
      motivo_cancelacion: this.estadoDestino === 3 ? this.motivoCancelacion : null
    };

    this.http
      .patch(`/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/estado`, payload, {
        headers: this.obtenerHeaders()
      })
      .subscribe({
        next: () => {
          this.guardandoEstado = false;
          this.cargarPedidos();
        },
        error: (error) => {
          this.guardandoEstado = false;
          this.mensajeError = this.extraerError(error, 'No se pudo actualizar el estado del pedido.');
        }
      });
  }

  registrarPagoPedido(): void {
    if (!this.pedidoSeleccionado) {
      return;
    }

    this.registrandoPago = true;
    this.mensajeError = '';

    const payload = {
      estado_pago: this.estadoPago,
      pago_parcial: this.estadoPago === 'PARCIAL' ? this.pagoParcial : null,
      monto_recibido: this.montoRecibido
    };

    this.http
      .post(`/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/pagos`, payload, {
        headers: this.obtenerHeaders()
      })
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
    this.mensajeError = '';

    const payload = {
      latitud: this.latitud,
      longitud: this.longitud,
      foto_frontis_url: this.fotoFrontisUrl || null
    };

    this.http
      .patch(`/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/ubicacion-evidencia`, payload, {
        headers: this.obtenerHeaders()
      })
      .subscribe({
        next: () => {
          this.guardandoUbicacion = false;
          this.cargarPedidos();
        },
        error: (error) => {
          this.guardandoUbicacion = false;
          this.mensajeError = this.extraerError(error, 'No se pudo guardar la ubicación y evidencia.');
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
      const direccion = (pedido.cliente?.direccion ?? '').toLowerCase();
      return `${pedido.pedido_id}`.includes(termino) || nombre.includes(termino) || direccion.includes(termino);
    });
  }

  abrirWhatsapp(pedido: PedidoDelivery): void {
    const numero = this.normalizarNumero(pedido.cliente?.celular ?? '');
    if (!numero) {
      return;
    }

    const mensaje = encodeURIComponent(`Hola, tu pedido #${pedido.pedido_id} está en proceso de entrega.`);
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

  totalDetalle(detalle: FormularioDetalle): number {
    return Number(((detalle.cantidad || 0) * (detalle.precio_unitario || 0)).toFixed(2));
  }

  totalFormulario(): number {
    return this.formulario.detalles.reduce((acum, detalle) => acum + this.totalDetalle(detalle), 0);
  }

  private crearFormularioPedido(): FormularioPedido {
    return {
      cliente_id: null,
      usarClienteNuevo: true,
      cliente_nuevo: {
        nombres: '',
        apellidos: '',
        celular: '',
        direccion: ''
      },
      delivery_usuario_id: null,
      fecha_hora_creacion: '',
      detalles: [{ producto_id: 0, cantidad: 1, peso_kg: null, precio_unitario: 0 }]
    };
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private fechaActualIsoLocal(): string {
    const ahora = new Date();
    const tzOff = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - tzOff).toISOString().slice(0, 16);
  }

  private extraerError(error: unknown, fallback: string): string {
    const errorApi = error as { error?: { message?: string; errors?: Record<string, string[]> } };
    const errores = errorApi?.error?.errors;
    if (errores) {
      const primer = Object.values(errores)?.[0]?.[0];
      if (primer) {
        return primer;
      }
    }

    return errorApi?.error?.message ?? fallback;
  }

  private normalizarNumero(numero: string): string {
    const limpio = (numero || '').replace(/\D/g, '');
    if (limpio.length === 9) {
      return limpio;
    }
    return '';
  }
}
