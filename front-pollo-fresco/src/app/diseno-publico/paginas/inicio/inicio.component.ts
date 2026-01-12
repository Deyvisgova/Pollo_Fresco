import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Carrusel } from '../../estructura/carrusel/carrusel.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [Carrusel, MatCardModule, MatIconModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class Inicio {}
