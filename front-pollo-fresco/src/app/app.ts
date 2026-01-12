import { Component } from '@angular/core';
import { BarraNavegacionComponent } from './diseno-publico/componentes/barra-navegacion/barra-navegacion.component';
import { CarruselComponent } from './diseno-publico/componentes/carrusel/carrusel.component';
import { PiePaginaComponent } from './diseno-publico/componentes/pie-pagina/pie-pagina.component';

@Component({
  selector: 'app-root',
  imports: [BarraNavegacionComponent, CarruselComponent, PiePaginaComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
