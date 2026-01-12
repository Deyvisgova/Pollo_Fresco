import { Component, signal } from '@angular/core';
import { BarraNavegacion } from './diseno-publico/estructura/barra-navegacion/barra-navegacion';
import { Carrusel } from './diseno-publico/estructura/carrusel/carrusel';
import { PiePagina } from './diseno-publico/estructura/pie-pagina/pie-pagina';
import { PreCabecera } from './diseno-publico/estructura/pre-cabecera/pre-cabecera';
import { Inicio } from './diseno-publico/paginas/inicio/inicio';

@Component({
  selector: 'app-root',
  imports: [
    BarraNavegacion,
    Carrusel,
    Inicio,
    PiePagina,
    PreCabecera
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front-pollo-fresco');
}
