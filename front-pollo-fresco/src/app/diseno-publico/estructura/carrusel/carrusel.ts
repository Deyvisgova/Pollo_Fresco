import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-carrusel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule],
  templateUrl: './carrusel.html',
  styleUrl: './carrusel.css'
})
export class Carrusel {
  readonly slides = [
    {
      title: 'Pollo entero',
      summary: 'Peso ideal, listo para preparar al instante y con frescura diaria.',
      detail: 'Ideal para asados y guisos, con selección diaria en Pollo Fresco.',
      image: 'assets/images/carousel-2.png'
    },
    {
      title: 'Cortes premium',
      summary: 'Pechuga, muslo y pierna con cortes limpios para restaurantes.',
      detail: 'Empacado higiénico y listo para porcionar en tu negocio.',
      image: 'assets/images/carousel-1.png'
    },
    {
      title: 'Atención mayorista',
      summary: 'Abastece tu negocio con entregas coordinadas y puntuales.',
      detail: 'Rutas programadas para pollerías, hoteles y restaurantes.',
      image: 'assets/images/carousel-3.png'
    }
  ];

  activeIndex = 0;

  get activeSlide() {
    return this.slides[this.activeIndex];
  }

  nextSlide(): void {
    this.activeIndex = (this.activeIndex + 1) % this.slides.length;
  }

  previousSlide(): void {
    this.activeIndex = (this.activeIndex - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number): void {
    this.activeIndex = index;
  }
}
