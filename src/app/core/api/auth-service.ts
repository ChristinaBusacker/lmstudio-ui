import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  getToken() {
    return 'super-long-random-string';
  }
}
