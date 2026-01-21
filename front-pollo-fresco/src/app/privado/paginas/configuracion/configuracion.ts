import { Component } from '@angular/core';

@Component({
  selector: 'app-privado-configuracion',
  // Componente informativo para la sección de configuracion.
  standalone: true,
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class PrivadoConfiguracion {
  logoPreviewUrl: string | null = null;
  logoFileName = 'logo-pollo-fresco.png';

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.logoFileName = file.name;
    this.logoPreviewUrl = URL.createObjectURL(file);
  }
}
