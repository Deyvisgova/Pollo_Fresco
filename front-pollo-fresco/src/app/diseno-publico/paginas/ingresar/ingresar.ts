import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AutenticacionServicio } from '../../../servicios/autenticacion.servicio';
import { SesionServicio } from '../../../servicios/sesion.servicio';

@Component({
  selector: 'app-ingresar',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './ingresar.html',
  styleUrl: './ingresar.css'
})
export class Ingresar {
  hidePassword = true;
  mensajeError = '';
  estaCargando = false;
  formulario!: FormGroup;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly autenticacionServicio: AutenticacionServicio,
    private readonly sesionServicio: SesionServicio,
    private readonly router: Router
  ) {
    this.formulario = this.formBuilder.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  enviarIngreso(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.mensajeError = '';
    this.estaCargando = true;

    this.autenticacionServicio
      .iniciarSesion(this.formulario.getRawValue())
      .pipe(finalize(() => (this.estaCargando = false)))
      .subscribe({
        next: (usuario) => {
          if (usuario.role !== 'admin') {
            this.sesionServicio.limpiarSesion();
            this.mensajeError =
              'Tu cuenta no tiene permisos de administrador.';
            return;
          }

          void this.router.navigate(['/privado']);
        },
        error: () => {
          this.mensajeError = 'No pudimos iniciar sesión. Verifica tus datos.';
        }
      });
  }
}
