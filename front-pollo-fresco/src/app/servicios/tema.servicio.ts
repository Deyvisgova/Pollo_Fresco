import { Injectable, signal } from '@angular/core';

type Tema = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class TemaServicio {
  private readonly storageKey = 'pollo-fresco-theme';
  private readonly tema = signal<Tema>('light');

  constructor() {
    this.inicializarTema();
  }

  temaActual() {
    return this.tema.asReadonly();
  }

  alternarTema(): void {
    const nuevoTema: Tema = this.tema() === 'dark' ? 'light' : 'dark';
    this.establecerTema(nuevoTema);
  }

  private inicializarTema(): void {
    const temaGuardado = localStorage.getItem(this.storageKey);

    if (temaGuardado === 'dark' || temaGuardado === 'light') {
      this.establecerTema(temaGuardado);
      return;
    }

    const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.establecerTema(prefiereOscuro ? 'dark' : 'light');
  }

  private establecerTema(tema: Tema): void {
    this.tema.set(tema);
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem(this.storageKey, tema);
  }
}
