import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../api/auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Nur für API-Requests (optional, aber nice)
  if (!req.url.startsWith('/api')) {
    return next(req);
  }

  // Token nur anhängen wenn vorhanden und noch kein Authorization gesetzt ist
  if (!token || req.headers.has('Authorization')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
};
