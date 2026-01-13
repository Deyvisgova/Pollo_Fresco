import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-barra-navegacion',
  standalone: true,
  imports: [MatButtonModule, MatToolbarModule, RouterLink, RouterLinkActive],
  templateUrl: './barra-navegacion.html',
  styleUrl: './barra-navegacion.css'
})
export class BarraNavegacion {}
