import { Injectable, NgZone } from '@angular/core';
import * as auth from 'firebase/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastService } from './toast.service';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AngularFireService {
  userData: any; // Save logged in user data
  constructor(
    public afs: AngularFirestore, // Inject Firestore service
    public afAuth: AngularFireAuth, // Inject Firebase auth service
    public router: Router,
    public toastService: ToastService,
    public ngZone: NgZone // NgZone service to remove outside scope warning
  ) {
    /* Saving user data in localstorage when 
    logged in and setting up null when logged out */
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        this.userData = user;
        localStorage.setItem('user', JSON.stringify(this.userData));
        JSON.parse(localStorage.getItem('user')!);
      } else {
        localStorage.setItem('user', 'null');
        JSON.parse(localStorage.getItem('user')!);
      }
    });
  }
  // Sign in with email/password
  SignIn(email: string, password: string) {
    return this.afAuth
      .signInWithEmailAndPassword(email, password)
      .then((result) => {
        this.afAuth.authState.subscribe((user) => {
          if (user) {
            this.router.navigate(['home']);
            this.toastService.ToastMessage('Bienvenido', 'top');
          }
        });
      })
      .catch((error) => {
        console.log(error);
        if (error.message == 'Firebase: The email address is badly formatted. (auth/invalid-email).')
          this.toastService.ToastMessage(
            'La dirección de email ingresada no es correcta.',
            'top'
          );
        else if (error.message == 'Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found).')
          this.toastService.ToastMessage(
            'Email o contraseña inválido.',
            'top'
          );
        // this.swal.SwalMensajeError('Error',error.message);
        // this.toastService.ToastMessage(error.message, 'top');
      });
  }
  // Sign up with email/password
  SignUp(email: string, password: string) {
    return this.afAuth
      .createUserWithEmailAndPassword(email, password)
      .then((result) => {
        /* Call the SendVerificaitonMail() function when new user sign 
        up and returns promise */
        this.SendVerificationMail();
      })
      .catch((error) => {
        if (error.message == 'Firebase: Error (auth/email-already-in-use).')
          this.toastService.ToastMessage(
            'La dirección de email ya se encuentra registrada.',
            'top'
          );
      });
  }
  // Send email verfificaiton when new user sign up
  SendVerificationMail() {
    return (
      this.afAuth.currentUser
        //TODO enviar email para verificar cuenta
        .then((u: any) => u.sendEmailVerification())
      // .then(() => {
      //   this.router.navigate(['registro']);
      // })
    );
  }
  // Reset Forggot password
  ForgotPassword(passwordResetEmail: string) {
    return this.afAuth
      .sendPasswordResetEmail(passwordResetEmail)
      .then(() => {
        // this.swal.SwalMensajeGenerico('Atencion','Se ha enviado un email para resetear el password');

        this.toastService.ToastMessage(
          'Se ha enviado un email para resetear el password',
          'top'
        );
      })
      .catch((error) => {
        // this.swal.SwalMensajeError('Error',error);
        this.toastService.ToastMessage(error.message, 'top');
      });
  }

  async isLoggedIn(): Promise<boolean> {
    const logueado = await this.GetLogueado();
    return logueado == true;
  }

  async userLoggedIn(): Promise<any> {
    const logueado = await this.GetUserLogueado();
    return logueado;
  }

  // Sign in with Google
  GoogleAuth() {
    return this.AuthLogin(new auth.GoogleAuthProvider()).then((res: any) => {
      this.router.navigate(['home']);
    });
  }
  // Auth logic to run auth providers
  AuthLogin(provider: any) {
    return this.afAuth
      .signInWithPopup(provider)
      .then((result) => {
        this.router.navigate(['home']);
      })
      .catch((error) => {
        // this.swal.SwalMensajeError('Error',error);
        this.toastService.ToastMessage(error.message, 'top');
      });
  }

  // Sign out
  SignOut() {
    return this.afAuth.signOut().then(() => {
      localStorage.removeItem('user');
      this.router.navigate(['']);
    });
  }

  GetLogueado() {
    return new Promise<boolean>((resolve, reject) => {
      this.afAuth.onAuthStateChanged((user) => {
        if (user) {
          // Usuario logueado
          resolve(true);
        } else {
          // Usuario no logueado
          resolve(false);
        }
      });
    });
  }

  GetEmailLogueado() {
    return new Promise<string>((resolve, reject) => {
      this.afAuth.onAuthStateChanged((user) => {
        if (user && user.email) {
          // Usuario logueado con correo electrónico
          resolve(user.email);
        } else {
          // Usuario no logueado o sin correo electrónico
          resolve('');
        }
      });
    });
  }

  GetUserLogueado() {
    return new Promise<any>((resolve, reject) => {
      this.afAuth.onAuthStateChanged((user) => {
        if (user) {
          // Usuario logueado con correo electrónico
          resolve(user);
        } else {
          // Usuario no logueado o sin correo electrónico
          resolve('');
        }
      });
    });
  }
}