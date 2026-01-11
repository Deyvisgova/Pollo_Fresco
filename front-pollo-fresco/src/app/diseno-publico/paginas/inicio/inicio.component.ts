import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { BarraNavegacionComponent } from '../../barra-navegacion/barra-navegacion.component';
import { CarruselComponent } from '../../carrusel/carrusel.component';
import { PiePaginaComponent } from '../../pie-pagina/pie-pagina.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    BarraNavegacionComponent,
    CarruselComponent,
    PiePaginaComponent
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent {}
