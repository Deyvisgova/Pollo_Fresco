import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SesionServicio } from './sesion.servicio';

export interface PedidoDetallePayload {
  producto_id: number;
  cantidad?: number;
  peso_kg: number;
  precio_unitario: number;
}

export interface PedidoPagoPayload {
  registrado_por: number;
  estado_pago: 'COMPLETO' | 'PENDIENTE' | 'PARCIAL';
  pago_parcial?: number;
  vuelto?: number;
}

export interface PedidoDeliveryPayload {
  cliente_id: number;
  vendedor_usuario_id: number;
  delivery_usuario_id?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  detalles: PedidoDetallePayload[];
  pago?: PedidoPagoPayload | null;
  foto_frontis?: File | null;
}

@Injectable({ providedIn: 'root' })
export class PedidosDeliveryServicio {
  private readonly apiBase = '/api';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  registrarPedido(payload: PedidoDeliveryPayload): Observable<unknown> {
    const token = this.sesionServicio.obtenerToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const formData = new FormData();
    formData.append('cliente_id', String(payload.cliente_id));
    formData.append('vendedor_usuario_id', String(payload.vendedor_usuario_id));

    if (payload.delivery_usuario_id) {
      formData.append('delivery_usuario_id', String(payload.delivery_usuario_id));
    }

    if (payload.latitud !== undefined && payload.latitud !== null) {
      formData.append('latitud', String(payload.latitud));
    }

    if (payload.longitud !== undefined && payload.longitud !== null) {
      formData.append('longitud', String(payload.longitud));
    }

    formData.append('detalles', JSON.stringify(payload.detalles));

    if (payload.pago) {
      formData.append('pago', JSON.stringify(payload.pago));
    }

    if (payload.foto_frontis) {
      formData.append('foto_frontis', payload.foto_frontis);
    }

    return this.http.post(`${this.apiBase}/pedidos-delivery`, formData, { headers });
  }
}
