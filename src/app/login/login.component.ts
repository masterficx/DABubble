import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationStart } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { initializeApp } from "firebase/app";
import { MatFormFieldModule } from '@angular/material/form-field';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc, setDoc, arrayUnion, collection, addDoc } from 'firebase/firestore';
import { DirectMessage } from '../../models/directMessage.class';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

const firebaseConfig = {
  apiKey: "AIzaSyADIl6lFvZbcvTiNMtyRwYxjris5fs4xrw",
  authDomain: "da-bubble-c165e.firebaseapp.com",
  projectId: "da-bubble-c165e",
  storageBucket: "da-bubble-c165e.appspot.com",
  messagingSenderId: "148990953407",
  appId: "1:148990953407:web:faf415ee7e1ac38142430a"
};

const provider = new GoogleAuthProvider();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss', './login.component.animations.scss', './login.component.responsive.scss']
})

export class LoginComponent implements OnInit, OnDestroy {
  auth = getAuth(app);

  startTextAnimation: boolean = false;
  removeDNone: boolean = false;
  removeAnimatedContainer: boolean = false;
  startLogoAnimation: boolean = false;
  isText: boolean = false;
  type: string = 'password';
  runAnimation = true;
  showAlert: boolean = false;
  showPasswordErrorDiv: boolean = false;
  showEmailErrorDiv: boolean = false;
  public getScreenWidth: any;
  public getScreenHeight: any;
  under650Px: boolean = false;
  addTheUpperMargin: boolean = false;

  private destroy$ = new Subject<void>();

  signInForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(100)],
    ],
  })

  constructor(private fb: FormBuilder, private router: Router) {
    const animationHasRunBefore = sessionStorage.getItem('animationHasRun');

    if (animationHasRunBefore) {
      this.runAnimation = false;
    }


  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.getScreenHeight = window.innerHeight;
    this.getScreenWidth = window.innerWidth;
    if (this.getScreenWidth <= 650) {
      this.under650Px = true
    } else if (this.getScreenWidth > 650) {
      this.under650Px = false
    }

    if (this.getScreenHeight <= 1045) {
      this.addTheUpperMargin = true;
    } else if (this.getScreenHeight > 1045) {
      this.addTheUpperMargin = false;
    }

    sessionStorage.setItem('animationHasRun', 'true');

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationStart),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationStart) => {
        if (event.navigationTrigger === 'popstate') {
          this.runAnimation = false;
        }
      });

    this.shouldStartAnimation();
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.getScreenWidth = window.innerWidth;
    this.getScreenHeight = window.innerHeight;
    if (this.getScreenWidth <= 650) {
      this.under650Px = true
    } else if (this.getScreenWidth > 650) {
      this.under650Px = false
    }

    if (this.getScreenHeight <= 1045) {
      this.addTheUpperMargin = true;
    } else if (this.getScreenHeight > 1045) {
      this.addTheUpperMargin = false;
    }
  }

  shouldStartAnimation() {
    if (this.runAnimation == true) {
      this.startTheAnimation()
    } else {
      this.removeAnimatedContainer = true;
    }
  }

  startTheAnimation() {
    setTimeout(() => {
      this.startLogoAnimation = true;
    }, 1375);
    setTimeout(() => {
      this.removeDNone = true;
    }, 1500);
    setTimeout(() => {
      this.startTextAnimation = true;
    }, 1500);
    setTimeout(() => {
      this.removeAnimatedContainer = true;
    }, 3100);
  }

  async signInWithGoogle() {
    await signInWithPopup(this.auth, provider)
      .then(async (result) => {
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          await updateDoc(userDocRef, {
            isOnline: true,
          });
          this.router.navigateByUrl('');
        } else {
          this.createUserDetailsDoc(result);
          await this.addUserToGeneralChannel();
          await this.createWelcomeMessage();
          this.router.navigateByUrl('');
        };
      })
  }

  async createWelcomeMessage() {
    const welcomeMessage = new DirectMessage({
      yourMessage: false,
      createdBy: 'gZrReha096XBbzYewrjt1cP8AZB2a',
      creationDate: Date.now(),
      message:
        'Herzlich willkommen auf dem Code Learning Server 👋 ich hoffe, du hast gut hergefunden',
      imageUrl:
        'https://firebasestorage.googleapis.com/v0/b/da-bubble-87fea.appspot.com/o/userImages%2FwelcomeGif.gif?alt=media&token=91f0cf99-d5d8-47ad-be89-15ca36856c35',
    });
    const newUserRef = doc(
      db,
      `users/${this.auth.currentUser.uid}/allDirectMessages`,
      'gZrReha096XBbzYewrjt1cP8AZB2'
    );

    try {
      await setDoc(newUserRef, {}, { merge: true });

      const directMessagesCollection = collection(
        db,
        `users/${this.auth.currentUser.uid}/allDirectMessages/gZrReha096XBbzYewrjt1cP8AZB2/directMessages`
      );

      const docRefNewUser = await addDoc(
        directMessagesCollection,
        welcomeMessage.toJSON()
      );

      await updateDoc(
        doc(
          db,
          `users/${this.auth.currentUser.uid}/allDirectMessages/gZrReha096XBbzYewrjt1cP8AZB2/directMessages`,
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

  async createUserDetailsDoc(result) {
    await setDoc(doc(db, 'users', result.user.uid), {
      name: result.user.displayName,
      email: result.user.email,
      imgUrl: result.user.photoURL,
      isOnline: false,
      id: result.user.uid,
    });
  }

  async addUserToGeneralChannel() {
    const channelRef = doc(db, 'channels', 'allgemein');
    await updateDoc(channelRef, {
      members: arrayUnion(this.auth.currentUser.uid),
    });
  }

  async signIn() {
    await signInWithEmailAndPassword(this.auth, this.signInForm.value.email, this.signInForm.value.password).then(async () => {
      let userRef = doc(db, "users", this.auth.currentUser.uid);
      await updateDoc(userRef, {
        isOnline: true,
      });
      this.router.navigateByUrl('');
    }).catch((error) => {
      if (error.code == 'auth/user-not-found') {
        this.showFalseLoginAlert();
      } else {
      }
    });
  }

  async signInAsGuest() {
    await signInWithEmailAndPassword(this.auth, 'guest@filip-todoroski.de', '123456');
    this.router.navigateByUrl('');
  }

  goToPasswordReset() {
    this.router.navigateByUrl('/reset_password')
  }

  togglePasswordVisibility() {
    this.isText = !this.isText
    this.type = this.isText ? "text" : "password";
  }

  showFalseLoginAlert() {
    this.showAlert = true;
    setTimeout(() => {
      this.signInForm.reset();
      this.showPasswordErrorDiv = false;
      this.showEmailErrorDiv = false;
      this.isText = false;
      this.showAlert = false;
    }, 3000);
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

  getPWErrorMessage(errors: ValidationErrors) {
    if (errors['required']) {
      return 'Bitte geben Sie Ihren Passwort ein';
    } else if (errors['minlength']) {
      return 'Das Passwort muss länger als 8 Zeichen sein';
    } else if (errors['maxlength']) {
      return 'Das Passwort darf nicht länger als 100 Zeichen sein';
    } else {
      return;
    }
  }

  checkErrors(control: string) {
    const errors = (this.signInForm.controls as any)[control].errors;
    if (control === 'email') {
      return this.getEmailErrorMessage(errors);
    } else if (control === 'password') {
      return this.getPWErrorMessage(errors);
    }
  }

}
