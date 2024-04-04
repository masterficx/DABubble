import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ChannelEditionDialogComponent } from './channel-edition-dialog/channel-edition-dialog.component';
import { ShowMembersDialogComponent } from './show-members-dialog/show-members-dialog.component';
import { AddMembersDialogComponent } from './add-members-dialog/add-members-dialog.component';
import { SecondaryChatComponent } from './secondary-chat/secondary-chat.component';
import { ChatService } from '../../services/chat.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Channel } from '../../../models/channel.class';
import { Thread } from '../../../models/thread.class';
import { ThreadComponent } from './thread/thread.component';
import { UserManagementService } from '../../services/user-management.service';
import { TextBoxComponent } from '../new-message/text-box/text-box.component';
import { ProfilecardsOtherUsersComponent } from './show-members-dialog/profilecards-other-users/profilecards-other-users.component';
import { Firestore, collection, doc, getDoc, limit, onSnapshot, orderBy, query } from '@angular/fire/firestore';
import { ViewManagementService } from '../../services/view-management.service';

@Component({
  selector: 'app-main-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ReactiveFormsModule, MatFormFieldModule,
    ChannelEditionDialogComponent, ShowMembersDialogComponent, AddMembersDialogComponent, SecondaryChatComponent, ThreadComponent,TextBoxComponent, ProfilecardsOtherUsersComponent],
  templateUrl: './main-chat.component.html',
  styleUrl: './main-chat.component.scss'
})

export class MainChatComponent implements OnInit, OnDestroy {
  /* === Other - variables === */
  screensize: string;
  screensizeSub: Subscription = new Subscription();
  private firestore: Firestore = inject(Firestore);
  @ViewChild('mainChat') private mainChat: ElementRef;
  dmMessagesPath = '';
  channelThreadsPath = '';
  path = '';

  /* === Channel - variables === */
  channel: Channel; // Daten des aktuellen Channels
  activeChannelId: string;
  activeChannelSub: Subscription = new Subscription();
  channelCreatorName: string;
  channelMembers = []; // Alle Userdaten der Mitglieder des Channels

  /* === Logged in user - variables === */
  currentUser: string;
  currentUserName: string;
  currentUserSub: Subscription = new Subscription();
  currentUserData: any;

  /* === Selected user for DM - variables === */
  dmMessages = [];
  activeDmUser: string;
  activeDmUserData: any;
  activeDmUserName: string;
  activeDmUserSub: Subscription = new Subscription();

  /* === Thread (channel or DM) variables === */
  channelThreads = []; // Alle Threads des Channels
  channelThreadsDateTime = []; // Hilfsarray mit spezifischen Feldern um die Threads anzuzeigen.
  threadCreationDates = []; // Einfaches Array mit den Erstelldaten der Threads z.B. "21.02.2024"
  threadId: string = '';
  textArea: string = "";
  subscription: Subscription = new Subscription();
  threadOpen: boolean = false;
  threads: Thread[] = [];

  /* === Boolean - variables === */
  typeChannel: boolean = true;
  addMemberDialogOpen: boolean = false;
  channelEditionDialogOpen: boolean = false;
  showMembersDialogOpen: boolean = false;
  editMessagePopupOpen: boolean = false;
  ownMessageEdit: boolean = false;
  showProfileCard: boolean = false
  desktopView: boolean = true;

  constructor(public chatService: ChatService, private userManagementService: UserManagementService,
    private viewService: ViewManagementService) {
    this.screensizeSub = viewService.screenSize$.subscribe((value) => {
      if(value) {
        this.screensize = value;
      }
    });

    this.currentUserSub = userManagementService.activeUserId$.subscribe((value) => {
      if(value) {
        this.currentUser = value;
      }
    });

    this.activeChannelSub = chatService.activeChannelIdUpdates.subscribe((valueChannel) => {
      if(valueChannel !== null) {
        this.activeChannelId = valueChannel;
        this.activeDmUser = null;
        this.getChannelAndDmPath();
        this.path = this.channelThreadsPath;
        this.loadChannelData();
        setTimeout(() => {
          this.scrollToBottom();
        }, 500);
      }
    });
      
    this.activeDmUserSub = chatService.activeUserIdUpdates.subscribe((valueDm) => {
      if(valueDm !== null) {
        this.activeDmUser = valueDm;
        this.activeChannelId = null;
        this.getChannelAndDmPath();
        this.path = this.dmMessagesPath;
        this.loadDmData();
        setTimeout(() => {
          this.scrollToBottom();
        }, 800);  
      }
    });
  }

  ngOnInit(): void { 
    this.setMobileViewComponents();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.activeChannelSub.unsubscribe();
    this.currentUserSub.unsubscribe();
    this.activeDmUserSub.unsubscribe();
  }

  /**
  *
  * Sets the boolean values of variables to ture, if the screensize is smaller or equal to 500px.
  */
  setMobileViewComponents() {
    if(window.innerWidth <= 500) {
      this.desktopView = false;
    } else {
      this.desktopView = true;
    }
  }
  
  /* ================== ID's FOM SERVICE ================== */
  /**
  * Sets the path to the correct subcollection within the channels and users collection.
  */
  getChannelAndDmPath() {
    this.dmMessagesPath = `users/${this.currentUser}/allDirectMessages/${this.activeDmUser}/directMessages`;
    this.channelThreadsPath = `channels/${this.activeChannelId}/threads`;
  }

  /* ================== MAIN CHAT CHANNEL DATA ================== */
  /**
   * Runs all the function to fetch the data for the active channel.
   */
  loadChannelData() {
    this.getcurrentUserData();
    this.getCurrentChannel();
    this.getThreadOpenStatus();
    this.subscribeToThreads();
  }

  /**
   * Runs all the function to fetch the data for the active direct message.
   */
  loadDmData() {
    this.getcurrentUserData();
    this.getDmUser();
  }

  /**
   * Returns the name of the selected dm user.
   * @param userId - id of the user of the selecte direct message
   */
  getcurrentUserData() {
    onSnapshot(doc(collection(this.firestore, 'users'), this.currentUser), (user) => {
      this.currentUserData = user.data();
    });
  }

  /**
   * Fetches the active Channel object and runs the getMembers and getThreads function.
   */
  getCurrentChannel() {
    onSnapshot(doc(collection(this.firestore, 'channels'), this.activeChannelId), (doc) => {
      this.channel = new Channel(doc.data());
      setTimeout(() => {
        this.getMembers();
      }, 200);
      setTimeout(() => {
        this.getThreads();
      }, 400);
      if (this.channel?.createdBy) {
        this.fetchChannelCreatorName(this.channel.createdBy).then(name => {
          this.channelCreatorName = name;
        });
      }
    });
  }


  /**
   * Fetches the data for every channel member an stores them in the channelMembers array.
   * @returns 
   */
  getMembers() {
      const q = query(collection(this.firestore, 'users'));
      return onSnapshot(q, (list) => {
        this.channelMembers = [];
        list.forEach(element => {
          if(this.channel['members'].includes(element.id)) {
            this.channelMembers.push(element.data());
          }
          if(this.currentUser == element.id) {
            this.currentUserName = element.data()['name'];
          }
        });
        this.sortChannelMembers();
    });
  }

  /**
   * Sorts the channelMembers array so that the current user is at the first position.
   */
  sortChannelMembers() {
    if(this.channelMembers.some(member => member.id == this.currentUser)) {
      let memberTofind = this.channelMembers.find(memObj => memObj.id == this.currentUser);
      let index = this.channelMembers.findIndex(memb => memb.id == this.currentUser);
      this.channelMembers.splice(index, 1);
      this.channelMembers.unshift(memberTofind);  
    }
  }

  /**
   * Fetches the data for every thread an stores them in the channelThreads array.
   * @returns 
   */
  getThreads() {
    const q = query(collection(this.firestore, this.path), orderBy("creationDate", "asc"), limit(20));
    // const q = query(collection(db, `channels/${this.activeChannelId}/threads`), orderBy("creationDate", "asc"), limit(20));
    return onSnapshot(q, (list) => {
      this.channelThreads = [];
      list.forEach(thread => {
          this.channelThreads.push(thread.data());
        }
      )
      this.sortChannelThreadsArray(this.channelThreads);
      this.getThreadCreationDates(this.channelThreads);
    });
  }

  /**
   * Retruns the name of the user that has created the acitve channel.
   * @param userId - id of the user that created the channel
   * @returns 
   */
  async fetchChannelCreatorName(userId: string): Promise<string> {
    const userRef = doc(this.firestore, "users", userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data()['name'] || 'Unbekannt';
    }
    return 'Unbekannt';
    }

  /**
   * Fetches the data of the user that is select in direct messages and sotres them in the activeDmUserData array.
   * @returns 
   */
  getDmUser() {
    onSnapshot(doc(collection(this.firestore, 'users'), this.activeDmUser), (dmUser) => {
      this.activeDmUserData = dmUser.data();
      this.getDmUserName(dmUser.id);
      setTimeout(() => {
        this.getCurrentDmUserMessages();
      }, 200);

    });
  }

  /**
   * Returns the name of the selected dm user.
   * @param userId - id of the user of the selecte direct message
   */
  async getDmUserName(userId: string) {
    this.activeDmUserName = ""; 
    const docRef = doc(this.firestore, "users", userId);
    const docSnap = await getDoc(docRef);   
    this.activeDmUserName = docSnap.data()['name']; 
  }
  

/*   getUserName(userId: string): string {
    const user = this.channelMembers.find(member => member.userId === userId);
    return user ? user.name : 'Unbekannter Benutzer';
  } */
  
  /**
   * Fetches the data for every direct message an stores them in the dmMessages array.
   * @returns 
   */
  getCurrentDmUserMessages() {
    const q = query(collection(this.firestore, this.dmMessagesPath), orderBy("creationDate", "asc"), limit(20));
    return onSnapshot(q, (list) => {
      this.dmMessages = [];
      list.forEach(dmMessage => {
          this.dmMessages.push(dmMessage.data());
        }
      )
      this.sortChannelThreadsArray(this.dmMessages);
      this.getThreadCreationDates(this.dmMessages);
      //console.log('Dm')
    });
  }

  /**
   * Sorts the channelThreads or the dmMessages array.
   * @param threadsOrDms - array (channelThreads or dmMessages)
   */
  sortChannelThreadsArray(threadsOrDms: any) {
    threadsOrDms.sort(this.compareByCreationDate);
  }

  /**
   * Sorts the JSON array according to the creation date, ascending.
   * @param b - creationDate of the message
   * @param a - creationDate of the message
   * @returns 
   */
  compareByCreationDate(b: any, a: any) {
    if(b.creationDate < a.creationDate){
      return -1;
    }
    if(b.creationDate > a.creationDate) {
      return 1;
    }
    return 0;
  }

  /**
   * 1. It transforms the thread creation dates into the date format dd.mm.yyyy. Then it pushes the transformed date in the 
   * threadCreationDates array, but only if the date not yet exists. This is needed to set up the time separators.
   * 2. It transforms all the data of a thread into the desired format, to be displayed later in the thread component.
   * To do so, all the necessary values are pushed in the channelThreadsDateTime array.
   * 3. It sorts both arrays depending on the creation date (ascending). 
   * @param threadsOrDms - array (channelThreads or dmMessages)
   */
  getThreadCreationDates(threadsOrDms: any) {
    this.channelThreadsDateTime = [];
    this.threadCreationDates = [];
    for (let i = 0; i < threadsOrDms.length; i++) {
      let message = threadsOrDms[i];
      let creationDate = message['creationDate'];
      let userId = message['createdBy'];
      let formattedDate = this.formattedDate(creationDate);
      let formattedDateTimeSeparator = this.getTimeSeparatorDate(creationDate);
      let formattedTime = this.getFormattedTime(creationDate);
      //let createdBy = this.getUserCreated(userId);
      let imageUrl = message['imageUrl'] || null;

      this.channelThreadsDateTime.push({
        'threadId': message['messageId'],
        'timestamp': message['creationDate'],
        'dateString': formattedDate,
        'timeSeparatorDate': formattedDateTimeSeparator,
        'time': formattedTime,
        'message': threadsOrDms[i]['message'],
        'userId': userId,
        'createdBy': this.getUserCreated(userId),
        'imgUrl': this.getImgUrl(userId),
        'imageUrl': imageUrl
      });
     
      if(!this.threadCreationDates.some(date => date.dateString === formattedDate)) {
        this.threadCreationDates.push({
          'dateString': formattedDate,
          'timeSeparatorDate': formattedDateTimeSeparator,
        });
      }
    }
    this.threadCreationDates.sort(this.compareByCreationDate);
    this.channelThreadsDateTime.sort(this.compareByCreationDate);
  } 

  /**
   * Formats the creation date of the thread to the defined format.
   * @param creationDate - thread creation date 
   * @returns 
   */
  formattedDate(creationDate: any) {
    const day = new Date(creationDate).toLocaleDateString('fr-CH', { day: 'numeric'});
    const month = new Date(creationDate).toLocaleDateString('fr-CH', { month: 'numeric'});
    const year = new Date(creationDate).toLocaleDateString('fr-CH', { year: 'numeric'});
    return `${day}.${month}.${year}`;
  }

  /**
   * Returns the formatted date of the tiem separator in the main chat an checks if the creation date is today.
   * If the creation date ist today, it returns "Heute".
   * @param creationDate - thred creation date
   * @returns 
   */
  getTimeSeparatorDate(creationDate: any) {
    let dateToday = new Date();
    const dateTodayUnix = dateToday.getTime();
    let convertedDate = this.formattedDateTimeSeparator(dateTodayUnix);
    creationDate = this.formattedDateTimeSeparator(creationDate);
    if(convertedDate == creationDate){
      return 'Heute';
    } else {
      return creationDate;
    }
  }

  /**
   * Formats the date of the time separator in the main chat to the defined format.
   * @param date - thred creation date
   * @returns 
   */
  formattedDateTimeSeparator(date: any) {
    const weekday = new Date(date).toLocaleDateString('de-DE', { weekday: 'long' });
    const day = new Date(date).toLocaleDateString('fr-CH', { day: 'numeric'});
    const month = new Date(date).toLocaleDateString('de-DE', { month: 'long'});
    return `${weekday}, ${day} ${month}`;
  }

  /**
   * Returns the time in "hh:mm" when the thread as been created.
   * @param creationDate - thread creation date
   * @returns 
   */
  getFormattedTime(creationDate: number) {
    const getString = (number) => number < 10 ? '0' + number : String(number);
    const getTime = (creationDate: number) => {
        const date = new Date(creationDate);
        const hours = getString(date.getHours());
        const minutes = getString(date.getMinutes());
        return `${hours}:${minutes}`;
    };
    return getTime(creationDate);
  }

  /**
   * It returns the name of the user how created the thread (in channels or DM's).
   * @param userId 
   * @returns 
   */
  getUserCreated(userId: string) {
    if(this.activeChannelId !== null){
      for (let i = 0; i < this.channelMembers.length; i++) {
        const userCreated = this.channelMembers[i];
        if(userId == userCreated['id']) {
          return userCreated['name'];
        }
      }
    } else {
      const q = query(collection(this.firestore, 'users'));
      onSnapshot(q, (list) => {
        list.forEach(element => {
          if(userId == element.id ) {
            return element.data()['name'];
          }  
        });
    });
    }
  }

  /**
   * It returns the url of the profile icon of the user how created the thread (in channels or DM's).
   * @param userId 
   * @returns 
   */
  getImgUrl(userId) {
    if(this.activeChannelId !== null) {
      for (let i = 0; i < this.channelMembers.length; i++) {
        const user = this.channelMembers[i];
        if(userId == user.id) {
          return user.imgUrl;
        }
      }  
    } else {
      return this.currentUserData.imgUrl;
    }
  }

  /**
   * It scrolls to the bottom of the chat to see the current message.
   */
  scrollToBottom() {
    setTimeout(() => {
      this.mainChat.nativeElement.scroll({
        top: this.mainChat.nativeElement.scrollHeight,
        left: 0,
        behavior: 'smooth'
      });
    }, 100)
  } 

  /* ================== MAIN CHAT OTHER FUNCTIONS ================== */
  /**
   * It shows/hides the needed dialog.
   * @param dialog - value to toggle the correct dialog
   */
  toggleDialog(dialog: string) {
    if (dialog == 'addMember') {
      if (this.addMemberDialogOpen == false) {
        this.addMemberDialogOpen = true;
      } else {
        this.addMemberDialogOpen = false;
      }
    } else if (dialog == 'channelEdition') {
      if (this.channelEditionDialogOpen == false) {
        this.channelEditionDialogOpen = true;
      } else {
        this.channelEditionDialogOpen = false;
      }
    } else if (dialog == 'showMembers') {
      if (this.showMembersDialogOpen == false) {
        this.showMembersDialogOpen = true;
      } else {
        this.showMembersDialogOpen = false;
      }
    }
  }

  /**
   * Hides/closes all open dialogs.  
   */
  closeDialog() {
    this.channelEditionDialogOpen = false;
    this.showMembersDialogOpen = false;
    this.addMemberDialogOpen = false;
    this.desktopView = false;
  }

  /**
   * Prevens an unwanted triggering of a function by clicking on an element.
   * @param $event 
   */
  doNotClose($event: any) {
    $event.stopPropagation();
  }

  /**
   * Sets the boolen values to close all dialogs.
   * @param dialogBoolen - value has true/false
   */
  setBoolean(dialogBoolen: boolean) {
    this.channelEditionDialogOpen = false;
    this.showMembersDialogOpen = false;
    this.addMemberDialogOpen = false;
  }

  /**
   * Opens up the add-members-dialog component.
   * @param addMemberDialogOpen - value has true/false
   */
  switchToAddMembers(addMemberDialogOpen: boolean) {
    this.addMemberDialogOpen = true;
  }

  /**
   * Opens the messages of the selected thread.
   * @param threadId - id of the selected thread
   */
  openThread(threadId: string): void {
    this.chatService.openThread(threadId);
  }

  /**
   * Subscribes to the threadOpen boolen to constantly get the current value.
   */
  getThreadOpenStatus(): void {
    this.subscription.add(this.chatService.threadOpen$.subscribe(open => {
      this.threadOpen = open;
    }));
  }

  /**
   * Subscribes to the threads array to constantly get the current messages of the thread.
   */
  subscribeToThreads(): void {
    this.subscription.add(
      this.chatService.threads$.subscribe(threads => {
        this.threads = threads;
      })
    );
  }

  /**
   * Sets the showProfileCard boolen to true to display the profilecards-other-users component.
   */
  openProfileCard() {
    this.showProfileCard = true;
  }

  /**
   * Sets the showProfileCard boolen to false to hide the profilecards-other-users component.
   * @param closeProfileCard 
   */
  closeProfileCard(closeProfileCard: boolean) {
    this.showProfileCard = false;
  }
}
