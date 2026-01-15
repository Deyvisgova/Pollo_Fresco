import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Proveedor {
  dni: string;
  ruc: string;
  nombres: string;
  apellidos: string;
  direccion: string;
  telefono: string;
}

@Component({
  selector: 'app-privado-proveedores-crud',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './proveedores-crud.html',
  styleUrl: './proveedores-crud.css'
})
export class PrivadoProveedoresCrud {
  private token = 'f3ba6fa1f3a2b2d1a6390dc06d831ebad2f218a9d3ba43e7f1f42b425dd03e26';

  consultaDni = '';
  consultaRuc = '';
  consultaResultado: Record<string, unknown> | null = null;
  consultaError = '';
  consultaCargando = false;

  proveedores: Proveedor[] = [
    {
      dni: '46781234',
      ruc: '',
      nombres: 'Luis Alberto',
      apellidos: 'Paredes Ramos',
      direccion: 'Av. Central 123 - Chiclayo',
      telefono: '987654321'
    }
  ];

  formulario: Proveedor = {
    dni: '',
    ruc: '',
    nombres: '',
    apellidos: '',
    direccion: '',
    telefono: ''
  };

  indiceEdicion: number | null = null;

  constructor(private http: HttpClient) {}

  consultarDni(): void {
    this.consultaError = '';
    this.consultaResultado = null;

    if (!this.consultaDni.trim()) {
      this.consultaError = 'Ingresa el DNI para consultar.';
      return;
    }

    if (this.consultaDni.length !== 8) {
      this.consultaError = 'El DNI debe tener 8 dígitos.';
      return;
    }

    const url = `https://apiperu.dev/api/dni/${this.consultaDni}?api_token=${this.token}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        this.consultaResultado = datos;
        this.autocompletarDesdeDni(datos);
      },
      error: () => {
        this.consultaError = 'No pudimos conectar con la SUNAT/RENIEC. Revisa el número e intenta nuevamente.';
      },
      complete: () => {
        this.consultaCargando = false;
      }
    });
  }

  consultarRuc(): void {
    this.consultaError = '';
    this.consultaResultado = null;

    if (!this.consultaRuc.trim()) {
      this.consultaError = 'Ingresa el RUC para consultar.';
      return;
    }

    if (this.consultaRuc.length !== 11) {
      this.consultaError = 'El RUC debe tener 11 dígitos.';
      return;
    }

    const url = `https://apiperu.dev/api/ruc/${this.consultaRuc}?api_token=${this.token}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        this.consultaResultado = datos;
        this.autocompletarDesdeRuc(datos);
      },
      error: () => {
        this.consultaError = 'No pudimos conectar con la SUNAT/RENIEC. Revisa el número e intenta nuevamente.';
      },
      complete: () => {
        this.consultaCargando = false;
      }
    });
  }

  guardarProveedor(): void {
    if (!this.formulario.nombres.trim()) {
      this.consultaError = 'Completa al menos el nombre o razón social del proveedor.';
      return;
    }

    if (this.indiceEdicion === null) {
      this.proveedores = [...this.proveedores, { ...this.formulario }];
    } else {
      this.proveedores = this.proveedores.map((proveedor, indice) =>
        indice === this.indiceEdicion ? { ...this.formulario } : proveedor
      );
    }

    this.limpiarFormulario();
  }

  editarProveedor(indice: number): void {
    this.indiceEdicion = indice;
    this.formulario = { ...this.proveedores[indice] };
  }

  eliminarProveedor(indice: number): void {
    this.proveedores = this.proveedores.filter((_, posicion) => posicion !== indice);
    if (this.indiceEdicion === indice) {
      this.limpiarFormulario();
    }
  }

  limpiarFormulario(): void {
    this.indiceEdicion = null;
    this.formulario = {
      dni: '',
      ruc: '',
      nombres: '',
      apellidos: '',
      direccion: '',
      telefono: ''
    };
  }

  private autocompletarDesdeDni(datos: Record<string, unknown>): void {
    const apellidoPaterno = (datos['apellido_paterno'] as string) ?? '';
    const apellidoMaterno = (datos['apellido_materno'] as string) ?? '';
    const nombres = (datos['nombres'] as string) ?? (datos['nombre'] as string) ?? '';

    this.formulario = {
      ...this.formulario,
      dni: ((datos['numero'] as string) ?? this.consultaDni).toString(),
      nombres: nombres || (datos['nombre_completo'] as string) || this.formulario.nombres,
      apellidos:
        `${apellidoPaterno} ${apellidoMaterno}`.trim() ||
        (datos['apellido'] as string) ||
        this.formulario.apellidos
    };
  }

  private autocompletarDesdeRuc(datos: Record<string, unknown>): void {
    this.formulario = {
      ...this.formulario,
      ruc: ((datos['numero'] as string) ?? this.consultaRuc).toString(),
      nombres:
        (datos['nombre_o_razon_social'] as string) ??
        (datos['razon_social'] as string) ??
        (datos['nombre_comercial'] as string) ??
        this.formulario.nombres,
      direccion: (datos['direccion'] as string) ?? this.formulario.direccion
    };
  }
}
