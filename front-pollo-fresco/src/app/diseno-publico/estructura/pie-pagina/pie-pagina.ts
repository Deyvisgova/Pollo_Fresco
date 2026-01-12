import { Component } from '@angular/core';

@Component({
  selector: 'app-pie-pagina',
  standalone: true,
  imports: [],
  templateUrl: './pie-pagina.html',
  styleUrl: './pie-pagina.css'
})
export class PiePagina {
  readonly currentYear = new Date().getFullYear();
}
