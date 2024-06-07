import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LoadingController, NavController } from '@ionic/angular';
import { AngularFireService } from 'src/app/services/angular-fire.service';
import { ToastService } from 'src/app/services/toast.service';
import { Barcode, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {

  currentEmail = '';
  credits: number = 0;
  scannedCodes: Set<string> = new Set();
  userProfile = { role: 'user' };  // Cambiar a 'admin' para el perfil de administrador
  adminScanCount: { [key: string]: number } = {};

  qrCodes: { [key: string]: number } = {
    '8c95def646b6127282ed50454b73240300dccabc': 10,
    'ae338e4e0cbb4e4bcffaf9ce5b409feb8edd5172 ': 50,
    '2786f4877b9091dcad7f35751bfcf5d5ea712b2f': 100
  };

  isSupported = false;
  barcodes: Barcode[] = [];
  userSubscription!: Subscription;
  horaActual: Date = new Date();
  intervalId: any;

  constructor(
    private firestore: AngularFirestore,
    private cdRef: ChangeDetectorRef,
    private angularFireService: AngularFireService,
    private toastService: ToastService,
    private navCtrl: NavController,
    private alertController: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.currentEmail = await this.angularFireService.GetEmailLogueado();
    BarcodeScanner.isSupported().then((result) => {
      this.isSupported = result.supported;
    });
    this.subscribeToUserCredits();

    this.intervalId = setInterval(() => {
      this.horaActual = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  get hora(): string {
    return this.horaActual.toLocaleTimeString();
  }

  subscribeToUserCredits(): void {
    const userDoc = this.firestore.collection('userCredits').doc(this.currentEmail);
    this.userSubscription = userDoc.valueChanges().subscribe((data: any) => {
      if (data) {
        this.credits = data.credits || 0;
        this.scannedCodes = new Set(data.scannedCodes || []);
        if (data.adminScanCount) {
          this.adminScanCount = data.adminScanCount;
        }
        this.cdRef.detectChanges();  // Ensure the view updates
      }
    });
  }

  async updateUserCredits(): Promise<void> {
    const userDoc = this.firestore.collection('userCredits').doc(this.currentEmail);
    await userDoc.set({
      credits: this.credits,
      scannedCodes: Array.from(this.scannedCodes),
      adminScanCount: this.adminScanCount
    });
  }

  async scan(): Promise<void> {
    const granted = await this.requestPermissions();
    if (!granted) {
      this.presentAlert();
      return;
    }
    const { barcodes } = await BarcodeScanner.scan();
    this.barcodes.push(...barcodes);
    for (let barcode of barcodes) {
      await this.handleQrCodeResult(barcode.rawValue);
    }
  }

  async requestPermissions(): Promise<boolean> {
    const { camera } = await BarcodeScanner.requestPermissions();
    return camera === 'granted' || camera === 'limited';
  }

  async presentAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Permission denied',
      message: 'Please grant camera permission to use the barcode scanner.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  async handleQrCodeResult(result: string): Promise<void> {
    if (!this.qrCodes[result]) {
      this.toastService.ToastMessage('Código QR no válido.', 'top');
      return;
    }

    if (this.currentEmail === 'admin@admin.com') {
      if (this.adminScanCount[result]) {
        if (this.adminScanCount[result] >= 2) {
          this.toastService.ToastMessage('No es posible asignar nuevamente el QR.', 'top');
          return;
        } else {
          this.adminScanCount[result]++;
        }
      } else {
        this.adminScanCount[result] = 1;
      }
    } else {
      if (this.scannedCodes.has(result)) {
        this.toastService.ToastMessage('El Código QR ya ha sido utilizado.', 'top');
        return;
      }
    }

    this.credits += this.qrCodes[result];
    this.scannedCodes.add(result);
    await this.updateUserCredits();
    this.toastService.ToastMessage(`${this.qrCodes[result]} Créditos se han cargado exitosamente!!`, 'top');
  }

  async clearCredits(): Promise<void> {
    this.credits = 0;
    this.scannedCodes.clear();
    this.adminScanCount = {};
    await this.updateUserCredits();
    this.toastService.ToastMessage('Créditos borrados!.', 'top');
  }

  async confirmClearCredits(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Borrar créditos',
      message: '¿Está seguro que desea borrar todos los créditos?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('Borrado de créditos cancelado');
          }
        },
        {
          text: 'Borrar',
          handler: () => {
            this.clearCredits();
          }
        }
      ]
    });

    await alert.present();
  }


  navigateTo(section: string) {
    this.navCtrl.navigateForward(`/${section}`);
  }

  async showLoading() {
    const loading = await this.loadingCtrl.create({
      message: 'Dismissing after 3 seconds...',
      duration: 3000,
    });

    loading.present();
  }
}