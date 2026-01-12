import { Component, signal } from '@angular/core';
import { BarraNavegacion } from './diseno-publico/estructura/barra-navegacion/barra-navegacion.component';
import { PiePagina } from './diseno-publico/estructura/pie-pagina/pie-pagina.component';
import { PreCabecera } from './diseno-publico/estructura/pre-cabecera/pre-cabecera.component';
import { Clientes } from './diseno-publico/paginas/clientes/clientes.component';
import { Contacto } from './diseno-publico/paginas/contacto/contacto.component';
import { Inicio } from './diseno-publico/paginas/inicio/inicio.component';
import { Nosotros } from './diseno-publico/paginas/nosotros/nosotros.component';
import { Productos } from './diseno-publico/paginas/productos/productos.component';

@Component({
  selector: 'app-root',
  imports: [
    BarraNavegacion,
    Clientes,
    Contacto,
    Inicio,
    Nosotros,
    PiePagina,
    PreCabecera,
    Productos
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front-pollo-fresco');
}
