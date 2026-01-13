import { Routes } from '@angular/router';
import { Clientes } from './diseno-publico/paginas/clientes/clientes';
import { Contacto } from './diseno-publico/paginas/contacto/contacto';
import { Ingresar } from './diseno-publico/paginas/ingresar/ingresar';
import { Inicio } from './diseno-publico/paginas/inicio/inicio';
import { Nosotros } from './diseno-publico/paginas/nosotros/nosotros';
import { Productos } from './diseno-publico/paginas/productos/productos';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio'
  },
  {
    path: 'inicio',
    component: Inicio
  },
  {
    path: 'nosotros',
    component: Nosotros
  },
  {
    path: 'productos',
    component: Productos
  },
  {
    path: 'clientes',
    component: Clientes
  },
  {
    path: 'contacto',
    component: Contacto
  },
  {
    path: 'ingresar',
    component: Ingresar
  }
];
