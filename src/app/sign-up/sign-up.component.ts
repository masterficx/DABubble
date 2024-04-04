import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { DirectMessage } from '../../models/directMessage.class';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyADIl6lFvZbcvTiNMtyRwYxjris5fs4xrw",
  authDomain: "da-bubble-c165e.firebaseapp.com",
  projectId: "da-bubble-c165e",
  storageBucket: "da-bubble-c165e.appspot.com",
  messagingSenderId: "148990953407",
  appId: "1:148990953407:web:faf415ee7e1ac38142430a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage();

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    RouterModule,
  ],
  templateUrl: './sign-up.component.html',
  styleUrls: [
    './sign-up.component.scss',
    './sign-up.component.responsive.scss',
  ],
})
export class SignUpComponent implements OnInit {
  auth = getAuth(app);

  first: boolean = true;
  second: boolean = false;
  person: string = 'zero';
  current: Date = new Date();
  uID: string = '';
  userCreationSuccess: boolean = false;
  isText: boolean = false;
  type: string = 'password';
  showNameAndUsernameErrorDiv: boolean = false;
  showEmailErrorDiv: boolean = false;
  showPasswordErrorDiv: boolean = false;
  showCheckboxErrorDiv: boolean = false;
  public getScreenWidth: any;
  public getScreenHeight: any;
  addTheUpperMargin: boolean = false;


  genericImg: string = '/assets/img/login/profile_generic_big.png';
  person1Img: string = '/assets/img/userImages/userImage1.svg';
  person2Img: string = '/assets/img/userImages/userImage2.svg';
  person3Img: string = '/assets/img/userImages/userImage3.svg';
  person4Img: string = '/assets/img/userImages/userImage4.svg';
  person5Img: string = '/assets/img/userImages/userImage5.svg';
  person6Img: string = '/assets/img/userImages/userImage6.svg';
  imgUrl: string = this.genericImg;

  @ViewChild('fileUpload') fileUpload: ElementRef;
  storage = getStorage();
  filePath: string;
  isCustomImage: boolean = false;

  registerForm = this.fb.group({
    nameAndSurname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(100)],
    ],
    checkbox: [false, Validators.requiredTrue],
  });

  constructor(private router: Router, private fb: FormBuilder) { }

  ngOnInit(): void {
    this.getScreenHeight = window.innerHeight;

    if (this.getScreenHeight <= 1045) {
      this.addTheUpperMargin = true;
    } else if (this.getScreenHeight > 1045) {
      this.addTheUpperMargin = false;
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.getScreenHeight = window.innerHeight;

    if (this.getScreenHeight <= 1045) {
      this.addTheUpperMargin = true;
    } else if (this.getScreenHeight > 1045) {
      this.addTheUpperMargin = false;
    }
  }

  goBackToLogin() {
    this.router.navigateByUrl('login');
  }

  goBackToFirst() {
    this.first = true;
    this.second = false;
  }

  getNotesRef() {
    return collection(db, 'users');
  }

  goToAvatarChoice() {
    this.first = false;
    this.second = true;
  }

  chooseAvatar(person: number) {
    if (this.isCustomImage) {
      this.deleteImageFromStorage(); // Löscht das aktuelle Bild aus dem Storage
      this.isCustomImage = false; // Setze isCustomImage zurück, da wir jetzt einen Standardavatar verwenden
    }

    if (person == 1) {
      this.imgUrl = this.person1Img;
      this.person = this.person1Img;
    } else if (person == 2) {
      this.imgUrl = this.person2Img;
      this.person = this.person2Img;
    } else if (person == 3) {
      this.imgUrl = this.person3Img;
      this.person = this.person3Img;
    } else if (person == 4) {
      this.imgUrl = this.person4Img;
      this.person = this.person4Img;
    } else if (person == 5) {
      this.imgUrl = this.person5Img;
      this.person = this.person5Img;
    } else if (person == 6) {
      this.imgUrl = this.person6Img;
      this.person = this.person6Img;
    }
  }


  async signUp() {
    await createUserWithEmailAndPassword(
      this.auth,
      this.registerForm.value.email,
      this.registerForm.value.password
    );
    await updateProfile(this.auth.currentUser, {
      displayName: this.registerForm.value.nameAndSurname,
      photoURL: this.imgUrl,
    });
    await this.createUserDetailsDoc();
    await this.addUserToGeneralChannel();
    await this.createWelcomeMessage();
    this.animateAndGoBackToLogin();
  }

  async createUserDetailsDoc() {
    await setDoc(doc(db, 'users', this.auth.currentUser.uid), {
      name: this.auth.currentUser.displayName,
      email: this.auth.currentUser.email,
      imgUrl: this.auth.currentUser.photoURL,
      isOnline: false,
      id: this.auth.currentUser.uid,
    });
  }

  async createWelcomeMessage() {
    const welcomeMessage = new DirectMessage({
      yourMessage: false,
      createdBy: 'WqUfBH53bPVombxH2XPYN70RULp1',
      creationDate: Date.now(),
      message:
        'Herzlich willkommen auf dem Code Learning Server 👋 ich hoffe, du hast gut hergefunden',
      imageUrl:
        'https://firebasestorage.googleapis.com/v0/b/da-bubble-87fea.appspot.com/o/userImages%2FwelcomeGif.gif?alt=media&token=91f0cf99-d5d8-47ad-be89-15ca36856c35',
    });
    const newUserRef = doc(
      db,
      `users/${this.auth.currentUser.uid}/allDirectMessages`,
      'WqUfBH53bPVombxH2XPYN70RULp1'
    );

    try {
      await setDoc(newUserRef, {}, { merge: true });

      const directMessagesCollection = collection(
        db,
        `users/${this.auth.currentUser.uid}/allDirectMessages/WqUfBH53bPVombxH2XPYN70RULp1/directMessages`
      );

      const docRefNewUser = await addDoc(
        directMessagesCollection,
        welcomeMessage.toJSON()
      );

      await updateDoc(
        doc(
          db,
          `users/${this.auth.currentUser.uid}/allDirectMessages/WqUfBH53bPVombxH2XPYN70RULp1/directMessages`,
          docRefNewUser.id
        ),
        {
          messageId: docRefNewUser.id,
        }
      );
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht: ', error);
    }
  }

  async addUserToGeneralChannel() {
    const channelRef = doc(db, 'channels', 'allgemein');
    await updateDoc(channelRef, {
      members: arrayUnion(this.auth.currentUser.uid),
    });
  }

  animateAndGoBackToLogin() {
    this.userCreationSuccess = true;
    setTimeout(() => {
      this.userCreationSuccess = false;
      signOut(this.auth);
      this.goBackToLogin();
    }, 3000);
  }

  async onFileSelected(event) {
    const file: File = event.target.files[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Nur PNG, JPG und SVG Dateien sind zulässig.');
      return;
    }
    const maxSizeInBytes = 1.5 * 1024 * 1024; // 1,5 MB in Bytes
    if (file.size > maxSizeInBytes) {
      alert('Die Datei ist zu groß. Maximale Dateigröße ist 1,5 MB.');
      return;
    }
    await this.uploadImage(file);
  }

  generateUniqueId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  async uploadImage(file: File) {
    try {
      const uniqueId = this.generateUniqueId();
      const uniqueFileName = `${uniqueId}-${file.name}`;
      const filePath = `profileImages/${uniqueFileName}`;
      this.filePath = filePath;
      const storageRef = ref(this.storage, filePath);
      const uploadTask = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadTask.ref);
      this.isCustomImage = true;
      this.imgUrl = downloadUrl; // Setze die neue Bild-URL
    } catch (error) {
      console.error('Error uploading file: ', error);
    }
  }

  async removeFileUpload() {
    if (!this.filePath) return;
    try {
      const storageRef = ref(this.storage, this.filePath);
      await deleteObject(storageRef);
      this.imgUrl = this.genericImg; // Setze das Bild zurück auf das Standardbild
      this.resetFileInput();
      this.isCustomImage = false;
    } catch (error) {
      console.error('Error deleting file: ', error);
    }
  }

  private resetFileInput() {
    if (this.fileUpload && this.fileUpload.nativeElement) {
      this.fileUpload.nativeElement.value = '';
    }
  }

  async deleteImageFromStorage() {
    if (!this.filePath || !this.isCustomImage) return;
    try {
      const storageRef = ref(this.storage, this.filePath);
      await deleteObject(storageRef);
      this.resetFileInput(); // Optional: Setze das file input zurück
      // Beachte, dass wir imgUrl hier nicht ändern
    } catch (error) {
      console.error('Fehler beim Löschen des Bildes aus dem Storage: ', error);
    }
  }

  togglePasswordVisibility() {
    this.isText = !this.isText;
    this.type = this.isText ? 'text' : 'password';
  }

  getPWErrorMessage(errors: ValidationErrors) {
    if (errors['required']) {
      return 'Bitte geben Sie einen Passwort ein';
    } else if (errors['minlength']) {
      return 'Das Passwort muss länger als 8 Zeichen sein';
    } else if (errors['maxlength']) {
      return 'Das Passwort darf nicht länger als 100 Zeichen sein';
    } else {
      return;
    }
  }

  getNameAndSurnameErrorMessage(errors: ValidationErrors) {
    if (errors['required']) {
      return 'Bitte geben Sie Ihr Vor und Nachnahme ein';
    } else {
      return;
    }
  }

  getEmailErrorMessage(errors: ValidationErrors) {
    if (errors['required']) {
      return 'Bitte geben Sie Ihre E-Mail-Adresse ein';
    } else if (errors['pattern']) {
      return 'Keine gültige E-Mail-Adresse';
    } else {
      return;
    }
  }

  getCheckBoxErrorMessage(errors: ValidationErrors) {
    if (errors['required']) {
      return 'Sie müssen das Kontrollkästchen aktivieren, um fortzufahren';
    } else {
      return;
    }
  }

  checkErrors(control: string) {
    const errors = (this.registerForm.controls as any)[control].errors;
    if (control === 'password') {
      return this.getPWErrorMessage(errors);
    } else if (control === 'email') {
      return this.getEmailErrorMessage(errors);
    } else if (control === 'nameAndSurname') {
      return this.getNameAndSurnameErrorMessage(errors);
    } else if (control === 'checkbox') {
      return this.getCheckBoxErrorMessage(errors);
    }
  }
}
