import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {}
