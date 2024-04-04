import { EventEmitter, Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, onSnapshot, query, setDoc } from 'firebase/firestore';
import { User } from '../../models/user.class';
import { getAuth } from 'firebase/auth';
import { ChatService } from './chat.service';



@Injectable({
  providedIn: 'root'
})

export class ProfilCardService {

  /* ========== FIREBASE ============ */
  firebaseConfig = {
    apiKey: "AIzaSyADIl6lFvZbcvTiNMtyRwYxjris5fs4xrw",
    authDomain: "da-bubble-c165e.firebaseapp.com",
    projectId: "da-bubble-c165e",
    storageBucket: "da-bubble-c165e.appspot.com",
    messagingSenderId: "148990953407",
    appId: "1:148990953407:web:faf415ee7e1ac38142430a"
  };
  app = initializeApp(this.firebaseConfig);
  db = getFirestore(this.app);
  userRef = collection(this.db, 'users');
  auth = getAuth(this.app);
  allUser = [];
  authSubscription: any;
  userNameandSurname: string = '';
  profilePic: string = '';
  userId: string = '';
  userEmailAddress: string = '';
  headerProfilePic: string = '';
  headerUserNameandSurname: string = '';
  currentUserId: string = '';
  otherUserId: string = '';
  guestIsOnline: boolean = false;

  isProfilCardActive: boolean = false;
  isOverlayActive: boolean = false;
  isCurrentUserActive: boolean;
  isProfilCardActiveChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(private chatService: ChatService) { }

  checkIfGuestOnline() {
    if (this.auth.currentUser.uid == 'oqEwmkKOgKUAkyrVuObdsQ7G6Ul2') {
      this.guestIsOnline = true;
    } else {
      this.guestIsOnline = false;
    }
  }

  /**
   * Toggles the overlay of the profile card.
   * @param active - Boolean indicating if the overlay should be active.
   */
  toggleCardOverlay(active: boolean) {
    this.isOverlayActive = active;
    this.isProfilCardActiveChanged.emit(active); // Emit event when the variable changes
    if (this.isProfilCardActive) {
      this.isProfilCardActive = false;
    }
  }

  /**
   * Toggles the visibility of the profile card.
   * @param active - Boolean indicating if the profile card should be active.
   * @param currentUser - Boolean indicating if the current user's profile card is active.
   * @param userId - The ID of the user whose profile card is being toggled.
   */
  toggleProfilCard(active: boolean, currentUser: boolean, userId: string) {
    if (!this.isOverlayActive) {
      this.isOverlayActive = true;
    }
    this.isProfilCardActive = active;
    this.isCurrentUserActive = currentUser;
    if (currentUser == false) {
      this.otherUserId = userId;
      let userDocRef = doc(this.userRef, userId);
      onSnapshot(userDocRef, (element) => {
        let userData = element.data();
        this.userNameandSurname = userData['name'];
        this.userEmailAddress = userData['email'];
        this.profilePic = userData['imgUrl']
      })
    }
  }

  /**
  * Updates the header with the provided name.
  * @param name - The name to be displayed in the header.
  * @returns The updated header.
  */
  updateHeader(name: string) {
    return name;
  }

  /**
   * Loads user data from Firestore.
   * @returns Snapshot listener for user data.
   */
  loadUserFromFirestore() {
    return onSnapshot(this.userRef, (list) => {
      // console.log('Hier sind die User:', list);
      this.allUser = [];
      list.forEach(element => {
        // console.log('Hier sind die User:', element.data(), element.id);
        this.allUser.push(new User(element.data()));
      })
    })
  }

  /**
   * Retrieves the logged-in user's information.
   */
  getTheLoggedInUser() {
    this.authSubscription = this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.profilePic = user.photoURL;
        this.headerProfilePic = user.photoURL;
        this.userNameandSurname = user.displayName;
        this.headerUserNameandSurname = user.displayName;
        this.userEmailAddress = user.email;
        this.currentUserId = user.uid;
      } else {
        this.profilePic = '/assets/img/login/profile_generic_big.png';
        this.userNameandSurname = 'Max Mustermann';
        this.userEmailAddress = 'maxmustermann@gmail.com'
      }
    });
  }

  /**
  * Writes a direct message between two users.
  * @returns Snapshot listener for direct messages.
  */
  writeDirectMessage() {
    const q = query(collection(this.db, `users/${this.auth.currentUser.uid}/allDirectMessages`));
    return onSnapshot(q, (list) => {
      list.forEach(element => {
        if (element.id === this.otherUserId) {
          this.chatService.setSelectedUserId(this.otherUserId);
          this.toggleCardOverlay(false);
        } else {
          // Create new DM Chat
          this.addDirectMessage();
          this.toggleCardOverlay(false);
        }
      });
    });
  }

  /**
   * Adds a new direct message between two users.
   * @returns Promise that resolves when the direct message is added.
   */
  async addDirectMessage(): Promise<void> {
    const dmSenderRef = doc(collection(this.db, `users/${this.auth.currentUser}/allDirectMessages`), this.otherUserId);
    const dmReceiverRef = doc(collection(this.db, `users/${this.otherUserId}/allDirectMessages`), this.currentUserId);
    let data = {}
    await setDoc(dmSenderRef, data);
    await setDoc(dmReceiverRef, data);
    this.chatService.setSelectedUserId(this.otherUserId);
  }
}
