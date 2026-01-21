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
  empresaNombre = 'Pollo Fresco';

  private readonly logoStorageKey = 'polloFrescoLogoUrl';
  private readonly logoNameStorageKey = 'polloFrescoLogoName';
  private readonly empresaStorageKey = 'polloFrescoEmpresaNombre';

  constructor() {
    this.logoPreviewUrl = localStorage.getItem(this.logoStorageKey);
    this.logoFileName = localStorage.getItem(this.logoNameStorageKey) ?? 'logo-pollo-fresco.png';
    this.empresaNombre = localStorage.getItem(this.empresaStorageKey) ?? 'Pollo Fresco';
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.logoFileName = file.name;
    localStorage.setItem(this.logoNameStorageKey, this.logoFileName);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        this.logoPreviewUrl = result;
        localStorage.setItem(this.logoStorageKey, result);
      }
    };
    reader.readAsDataURL(file);
  }

  onEmpresaNombreChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.empresaNombre = input.value;
    localStorage.setItem(this.empresaStorageKey, this.empresaNombre);
  }
}
