import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ProfilecardsOtherUsersComponent } from './profilecards-other-users/profilecards-other-users.component';

@Component({
  selector: 'app-show-members-dialog',
  standalone: true,
  imports: [CommonModule, ProfilecardsOtherUsersComponent],
  templateUrl: './show-members-dialog.component.html',
  styleUrl: './show-members-dialog.component.scss'
})

export class ShowMembersDialogComponent implements OnInit {
  @Input() currentUser!: string;
  @Input() currentChannelId!: string;
  @Input() channelMembers!: any;
  @Output() showMembersDialogOpenChild = new EventEmitter();
  @Output() addMembersDialogOpenOpenChildShow = new EventEmitter();
  showMembersDialogOpen: boolean;
  addMemberDialogOpen: boolean;
  @Output() addMemberDialogOpenChild = new EventEmitter();
  showProfileCard: boolean = false;
  addMembersMobile: boolean = false;
  memberData: any;

  ngOnInit(): void {
    this.setMobileComponents();
  }

   /**
   * Sets the boolean values of variables to ture, if the screensize is smaller or equal to 500px.
   */
  setMobileComponents() {
    if(window.innerWidth <= 500){
      this.addMembersMobile = true;
    } else {
      this.addMembersMobile = false;
    }
  }

  /**
   * Sets the data of the selected member und shows the profile card.
   * @param member - 
   */
  openProfileCard(member: any) {
    this.memberData = member; 
    this.showProfileCard = true;
  }

  /**
   * Prevens an unwanted triggering of a function by clicking on an element.
   * @param $event 
   */
  doNotClose($event: any) {
    $event.stopPropagation(); 
  }

  /**
   * Hides/closes the show members dialog component.  
   */
  closeDialog() {
    this.showMembersDialogOpen = false;
    this.showMembersDialogOpenChild.emit(this.showMembersDialogOpen);
  }

  /**
   * Hides/closes the profilecards-other-users component component.
   * @param closeProfileCard 
   */
  closeProfileCard(closeProfileCard: boolean) {
    this.showProfileCard = false;
  }

  /**
   * Hides/closes the show-members component and the profilecards-other-users component component.
   *
   * @param closeProfileCard 
   */
  closeAll(closeProfileCard: boolean) {
    this.showProfileCard = false;
    this.showMembersDialogOpen = false;
    this.showMembersDialogOpenChild.emit(this.showMembersDialogOpen);
  }

  /**
   * Displays the add-members-dialog component.
   */
  goToAddMemberDialog() {
    this.showMembersDialogOpen = false;
    this.showMembersDialogOpenChild.emit(this.showMembersDialogOpen)
    this.addMembersDialogOpenOpenChildShow.emit(this.addMemberDialogOpen)
  }

  /**
   * Displays the mobile version of the add-members-dialog component.
   */
  openAddMemberMobile() {
    this.addMemberDialogOpen = false;
    this.addMemberDialogOpenChild.emit(this.addMemberDialogOpen);
  }
}
