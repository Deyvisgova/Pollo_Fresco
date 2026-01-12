import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {}
