import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { SesionServicio, UsuarioSesion } from './sesion.servicio';

export interface CredencialesIngreso {
  email: string;
  password: string;
}

interface RespuestaLoginApi {
  message: string;
  user: UsuarioSesion;
  token: string;
}

/**
 * Servicio de autenticación que centraliza el inicio de sesión
 * contra la API de Laravel.
 */
@Injectable({ providedIn: 'root' })
export class AutenticacionServicio {
  // URL base de la API. Ajustar si cambia el dominio o puerto.
  private readonly apiBase = 'http://localhost:8000/api';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  /**
   * Envía las credenciales al backend, guarda la sesión y retorna el usuario autenticado.
   */
  iniciarSesion(credenciales: CredencialesIngreso): Observable<UsuarioSesion> {
    return this.http
      .post<RespuestaLoginApi>(`${this.apiBase}/auth/login`, credenciales)
      .pipe(
        tap((respuesta) =>
          this.sesionServicio.guardarSesion(respuesta.user, respuesta.token)
        ),
        map((respuesta) => respuesta.user)
      );
  }
}
