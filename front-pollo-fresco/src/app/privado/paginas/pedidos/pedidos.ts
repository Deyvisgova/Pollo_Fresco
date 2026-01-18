import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PedidosDeliveryServicio, PedidoDetallePayload, PedidoPagoPayload } from '../../../servicios/pedidos-delivery.servicio';

interface PedidoDetalleFormulario extends PedidoDetallePayload {
  id: number;
}

@Component({
  selector: 'app-privado-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class PrivadoPedidos {
  clienteId: number | null = null;
  vendedorId: number | null = null;
  deliveryId: number | null = null;
  latitud: number | null = null;
  longitud: number | null = null;
  detalles: PedidoDetalleFormulario[] = [
    {
      id: 1,
      producto_id: 0,
      cantidad: 1,
      peso_kg: 0,
      precio_unitario: 0
    }
  ];
  fotoFrontis: File | null = null;
  pago: PedidoPagoPayload = {
    registrado_por: 0,
    estado_pago: 'PENDIENTE',
    pago_parcial: undefined,
    vuelto: 0
  };
  incluirPago = false;
  respuesta: string | null = null;
  cargando = false;

  constructor(private readonly pedidosDeliveryServicio: PedidosDeliveryServicio) {}

  agregarDetalle(): void {
    const siguienteId = this.detalles.length
      ? Math.max(...this.detalles.map((detalle) => detalle.id)) + 1
      : 1;

    this.detalles.push({
      id: siguienteId,
      producto_id: 0,
      cantidad: 1,
      peso_kg: 0,
      precio_unitario: 0
    });
  }

  eliminarDetalle(id: number): void {
    if (this.detalles.length === 1) {
      return;
    }

    this.detalles = this.detalles.filter((detalle) => detalle.id !== id);
  }

  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fotoFrontis = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  registrarPedido(): void {
    this.respuesta = null;

    if (!this.clienteId || !this.vendedorId) {
      this.respuesta = 'Debes completar cliente y vendedor.';
      return;
    }

    const detallesPayload: PedidoDetallePayload[] = this.detalles.map((detalle) => ({
      producto_id: Number(detalle.producto_id),
      cantidad: detalle.cantidad ? Number(detalle.cantidad) : undefined,
      peso_kg: Number(detalle.peso_kg),
      precio_unitario: Number(detalle.precio_unitario)
    }));

    const payload = {
      cliente_id: this.clienteId,
      vendedor_usuario_id: this.vendedorId,
      delivery_usuario_id: this.deliveryId ?? undefined,
      latitud: this.latitud ?? undefined,
      longitud: this.longitud ?? undefined,
      detalles: detallesPayload,
      pago: this.incluirPago ? this.pago : null,
      foto_frontis: this.fotoFrontis
    };

    this.cargando = true;
    this.pedidosDeliveryServicio.registrarPedido(payload).subscribe({
      next: (respuesta) => {
        this.respuesta = JSON.stringify(respuesta, null, 2);
        this.cargando = false;
      },
      error: (error) => {
        this.respuesta = `Error al registrar: ${JSON.stringify(error?.error ?? error)}`;
        this.cargando = false;
      }
    });
  }
}
