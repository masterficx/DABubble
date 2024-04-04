export class User {
  userId: string;
  name: string;
  email: string;
  imgUrl: string;
  isOnline: boolean;
  directMessages: [];

  constructor(obj?: any) {
    // Zuweiseung der Werte des hineingegebenen Objektes zu den Feldern der Klasse.
    this.userId = obj ? obj.userId : '';
    this.name = obj ? obj.name : ''; // if else Abfrage schneller geschrieben. Wenn das Objekt existiert, dann obj.firstname und sonst ein leerer String.
    this.email = obj ? obj.email : '';
    this.imgUrl = obj ? obj.imgUrl : '';
    this.isOnline = obj ? obj.isOnline : '';
    this.directMessages = obj ? obj.directMessages : '';
  }

  public toJSON() {
    return {
      userId: this.userId,
      name: this.name,
      email: this.email,
      imgUrl: this.imgUrl,
      isOnline: this.isOnline,
      directMessages: this.directMessages,
    };
  }
}
