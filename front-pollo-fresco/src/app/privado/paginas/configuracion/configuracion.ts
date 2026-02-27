import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfiguracionEmpresa,
  ConfiguracionEmpresaServicio
} from '../../../servicios/configuracion-empresa.servicio';

@Component({
  selector: 'app-privado-configuracion',
  // Componente para editar la configuración visual del módulo privado.
  standalone: true,
  imports: [FormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class PrivadoConfiguracion {
  configuracion: ConfiguracionEmpresa;
  mensajeGuardado = '';
  mensajeError = '';
  subiendoLogo = false;

  constructor(private readonly configuracionEmpresaServicio: ConfiguracionEmpresaServicio) {
    const configuracionActual = this.configuracionEmpresaServicio.configuracion();
    this.configuracion = {
      nombreEmpresa: configuracionActual.nombreEmpresa,
      logoUrl: configuracionActual.logoUrl
    };
  }

  guardarConfiguracion(): void {
    this.configuracionEmpresaServicio.guardarConfiguracion(this.configuracion);
    this.mensajeError = '';
    this.mensajeGuardado = 'Configuración guardada correctamente.';
  }

  seleccionarLogo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    this.subiendoLogo = true;
    this.mensajeGuardado = '';
    this.mensajeError = '';

    this.configuracionEmpresaServicio.subirLogo(archivo).subscribe({
      next: (logoUrl) => {
        this.configuracion.logoUrl = logoUrl;
        this.subiendoLogo = false;
        this.mensajeGuardado = 'Logo cargado correctamente.';
      },
      error: () => {
        this.subiendoLogo = false;
        this.mensajeError = 'No se pudo subir el logo. Intenta con una imagen válida.';
      }
    });
  }
}
