import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { NavController } from '@ionic/angular';
import { AngularFireService } from 'src/app/services/angular-fire.service';
import { ToastService } from 'src/app/services/toast.service';
import { Barcode, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {

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

  constructor(
    private firestore: AngularFirestore,
    private cdRef: ChangeDetectorRef, 
    private angularFireService: AngularFireService,
    private toastService: ToastService,
    private navCtrl: NavController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    this.currentEmail = await this.angularFireService.GetEmailLogueado();
    BarcodeScanner.isSupported().then((result) => {
      this.isSupported = result.supported;
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
      this.handleQrCodeResult(barcode.rawValue);
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

  handleQrCodeResult(result: string): void {
    if (!this.qrCodes[result]) {
      alert('Código QR no válido.');
      return;
    }

    if (this.currentEmail === 'admin@admin.com') {
      if (this.adminScanCount[result]) {
        if (this.adminScanCount[result] >= 2) {
          alert('No se puede cargar el código más de dos veces.');
          return;
        } else {
          this.adminScanCount[result]++;
        }
      } else {
        this.adminScanCount[result] = 1;
      }
    } else {
      if (this.scannedCodes.has(result)) {
        alert('Código QR ya cargado.');
        return;
      }
    }

    this.credits += this.qrCodes[result];
    this.scannedCodes.add(result);
    alert(`Crédito cargado: ${this.qrCodes[result]}. Crédito total: ${this.credits}`);
  }

  clearCredits(): void {
    this.credits = 0;
    this.scannedCodes.clear();
    this.adminScanCount = {};
    alert('Créditos limpiados.');
  }
}
