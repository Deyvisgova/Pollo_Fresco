import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css'
})
export class Clientes {}
