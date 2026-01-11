import { Component, signal } from '@angular/core';
import { InicioComponent } from './diseno-publico/paginas/inicio/inicio.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [InicioComponent],
  template: '<app-inicio></app-inicio>'
})
export class App {
  protected readonly title = signal('front-pollo-fresco');
}
