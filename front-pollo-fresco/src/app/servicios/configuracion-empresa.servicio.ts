import { Injectable, signal } from '@angular/core';

export interface ConfiguracionEmpresa {
  nombreEmpresa: string;
  logoUrl: string;
}

const CONFIGURACION_POR_DEFECTO: ConfiguracionEmpresa = {
  nombreEmpresa: 'Nombre de la empresa',
  logoUrl: ''
};

@Injectable({ providedIn: 'root' })
export class ConfiguracionEmpresaServicio {
  private readonly llaveConfiguracion = 'configuracion_empresa';
  readonly configuracion = signal<ConfiguracionEmpresa>(CONFIGURACION_POR_DEFECTO);

  constructor() {
    this.cargarConfiguracion();
  }

  guardarConfiguracion(configuracion: ConfiguracionEmpresa): void {
    const configuracionLimpia: ConfiguracionEmpresa = {
      nombreEmpresa: configuracion.nombreEmpresa.trim() || CONFIGURACION_POR_DEFECTO.nombreEmpresa,
      logoUrl: configuracion.logoUrl.trim()
    };

    localStorage.setItem(this.llaveConfiguracion, JSON.stringify(configuracionLimpia));
    this.configuracion.set(configuracionLimpia);
  }

  private cargarConfiguracion(): void {
    const data = localStorage.getItem(this.llaveConfiguracion);

    if (!data) {
      this.configuracion.set(CONFIGURACION_POR_DEFECTO);
      return;
    }

    try {
      const configuracion = JSON.parse(data) as Partial<ConfiguracionEmpresa>;
      this.configuracion.set({
        nombreEmpresa: configuracion.nombreEmpresa?.trim() || CONFIGURACION_POR_DEFECTO.nombreEmpresa,
        logoUrl: configuracion.logoUrl?.trim() || ''
      });
    } catch {
      this.configuracion.set(CONFIGURACION_POR_DEFECTO);
    }
  }
}
