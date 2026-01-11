import { Component, signal } from '@angular/core';
import { InicioComponent } from './diseno-publico/paginas/inicio/inicio.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [InicioComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front-pollo-fresco');
}
