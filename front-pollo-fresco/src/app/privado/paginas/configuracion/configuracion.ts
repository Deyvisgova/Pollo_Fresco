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

  constructor(private readonly configuracionEmpresaServicio: ConfiguracionEmpresaServicio) {
    const configuracionActual = this.configuracionEmpresaServicio.configuracion();
    this.configuracion = {
      nombreEmpresa: configuracionActual.nombreEmpresa,
      logoUrl: configuracionActual.logoUrl
    };
  }

  guardarConfiguracion(): void {
    this.configuracionEmpresaServicio.guardarConfiguracion(this.configuracion);
    this.mensajeGuardado = 'Configuración guardada correctamente.';
  }
}
