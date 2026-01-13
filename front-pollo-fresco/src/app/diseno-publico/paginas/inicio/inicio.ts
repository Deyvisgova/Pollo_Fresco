import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Carrusel } from '../../estructura/carrusel/carrusel';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [Carrusel, MatCardModule, MatIconModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {}
