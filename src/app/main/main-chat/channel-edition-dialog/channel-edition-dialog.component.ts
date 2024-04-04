import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { ViewManagementService } from '../../../services/view-management.service';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { ShowMembersDialogComponent } from '../show-members-dialog/show-members-dialog.component';
import { AddMembersDialogComponent } from '../add-members-dialog/add-members-dialog.component';
import { deleteDoc } from 'firebase/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-channel-edition-dialog',
  standalone: true,
  imports: [ CommonModule, FormsModule, ShowMembersDialogComponent, AddMembersDialogComponent ],
  templateUrl: './channel-edition-dialog.component.html',
  styleUrl: './channel-edition-dialog.component.scss'
})
export class ChannelEditionDialogComponent implements OnInit {
  screensize: string;
  screensizeSub: Subscription = new Subscription();
  private firestore: Firestore = inject(Firestore);
  @Input() channelData!: any;
  @Input() currentChannelId!: string;
  @Input() channelCreatorName!: string;
  @Input() currentUser!: string;
  @Input() channelMembers!: any;
  channelEditionDialogOpen: boolean;
  @Output() channelEditionDialogOpenChild = new EventEmitter();
  showchannelEditionName: boolean = true;
  showchannelEditionDescription: boolean = true;
  editedChannelName: string;
  editedChannelDescription: string;
  showPopup: boolean = false;
  showPopupLeaveChannel: boolean = false;
  showPopupAdmin: boolean = false;
  showMembersInEditionDialog: boolean = false;
  editMobile: boolean = false;
  saveMobile: boolean = false;
  addMemberDialogOpen: boolean = false;
  addMembersMobileView: boolean = false;

  constructor(private chatService: ChatService, private viewService: ViewManagementService) {
    this.screensizeSub = viewService.screenSize$.subscribe((value) => {
      if(value) {
        this.screensize = value;
        if(value == 'extraSmall'){
          this.showMembersInEditionDialog = true;
        } else {
          this.showMembersInEditionDialog = false;
        }
      }
    });
  }

  ngOnInit(): void {
    this.setMobileComponents();
  }

  /**
   * Sets the boolean values of variables to ture, if the screensize is smaller or equal to 500px.
   */
  setMobileComponents() {
    if(window.innerWidth <= 500){
      this.showMembersInEditionDialog = true;
      this.editMobile = true;
    } else {
      this.showMembersInEditionDialog = false;
      this.editMobile = false;
    }
  }

  /**
   * The edit template of the channel name is beeing shown, but only if the current logged in user is the one that created
   * the channel. Otherwise a popup is shown that only the admi can change this data.
   * The function is called when the user clicks on the edit button or sign (moible).
   */
  editChannelName() {
    if(this.currentUser == this.channelData.createdBy) {
      this.showchannelEditionName = false;
    } else {
      this.showPopup = true;
      setTimeout(() => {
        this.showPopup = false;
      }, 4000);
    }
  }

  /**
   * Saves the new channel name (value from the input) in firebase. If the input has no value, the edit template just closes.
   * The function is called when the user clikcs on the save button/icon(mobile).
   */
  async saveChannelName() {
    if(this.editedChannelName) {
      let currentChannelRef = doc(this.firestore, 'channels', this.currentChannelId);
      let data = {name: this.editedChannelName };
      await updateDoc(currentChannelRef, data).then(() => {
      });
      this.editedChannelName = "";
      this.showchannelEditionName = true;
    } else {
      this.showchannelEditionName = true;
    }
  }

   /**
   * The edit template of the channel description is beeing shown, but only if the current logged in user is the one that created
   * the channel. Otherwise a popup is shown that only the admi can change this data.
   * The function is beeing called when the user clicks on the edit button or sign (moible).
   */
  editChannelDescription() {
    if(this.currentUser == this.channelData.createdBy) {
      this.showchannelEditionDescription = false;
    } else {
      this.showPopup = true;
      setTimeout(() => {
        this.showPopup = false;
      }, 4000);
    }
  }

    /**
   * Saves the new channel description (value from the input) in firebase. If the input has no value, the edit template 
   * just closes. The function is called when the user clikcs on the save button/icon(mobile).
   */
  async saveChannelDescription() {
    if(this.editedChannelDescription) {
      let currentChannelRef = doc(this.firestore, 'channels', this.currentChannelId);
      let data = {description: this.editedChannelDescription };
      await updateDoc(currentChannelRef, data).then(() => {
      });
      this.editedChannelDescription = "";
      this.showchannelEditionDescription = true;  
    } else {
      this.showchannelEditionDescription = true;  
    }
  }

  /**
   * Checks if the user that whants to leave the channel ist the one who created it. If that is the case, as message shows
   * that the admin cannot leave the channel. Otherwise the logged in user is removed from the members array of the current
   * channel. All the popups and dialog components are closed und the channels/direct messages are unset und the user is
   * forwarded to the new message component.
   */
  async leaveChannel() {
    if(this.currentUser == this.channelData.createdBy) {
      await deleteDoc(doc(this.firestore, `channels`, this.currentChannelId));
      this.showPopupLeaveChannel = false;   
      this.channelEditionDialogOpen = false;
      this.channelEditionDialogOpenChild.emit(this.channelEditionDialogOpen);
      this.chatService.setActiveChannelId(null);
      this.chatService.setSelectedUserId(null);
      this.viewService.setView('newMessage');  
    } else {
      let index = this.channelData.members.indexOf(this.currentUser);
      this.channelData.members.splice(index, 1);
      let currentRef = doc(this.firestore, `channels/${this.currentChannelId}`);
      let data = {
        members: this.channelData.members
      };
      await updateDoc(currentRef, data).then(() => {
      }); 
      this.showPopupLeaveChannel = false;   
      this.channelEditionDialogOpen = false;
      this.channelEditionDialogOpenChild.emit(this.channelEditionDialogOpen);
      this.chatService.setActiveChannelId(null);
      this.chatService.setSelectedUserId(null);
      this.viewService.setView('newMessage');  
    }
  }
  
  /**
   * Hides/closes the channel edition dialog component.  
   */
  closeDialog() {
    this.channelEditionDialogOpen = false;
    this.channelEditionDialogOpenChild.emit(this.channelEditionDialogOpen)
  }

  /**
   * Opens the popup where the user is aksed if he really wants to leave the channel.
   */
  openAskLeaveChannel() {
    this.showPopupLeaveChannel = true;
  }

   /**
   * Closes the popup where the user is aksed if he really wants to leave the channel.
   */
  closePopupLeaveChannel() {
    this.showPopupLeaveChannel = false;
  }

  /**
   * Opens the add member component in the mobile version.
   * @param showAddMemberMobile
   */
  openAddMemberMobile(showAddMemberMobile: boolean) {
    this.addMemberDialogOpen = true;
    this.addMembersMobileView = true;
  }

   /**
   * Closes the add member component in the mobile version.
   * @param addMemberDialogOpen
   */
  closeAddMemberMobile(addMemberDialogOpen: boolean) {
    this.addMemberDialogOpen = false;
  }

  /**
   * Prevens an unwanted triggering of a function by clicking on an element.
   * @param $event 
   */
  doNotClose($event: any) {
    $event.stopPropagation(); 
  }
}
