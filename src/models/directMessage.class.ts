export class DirectMessage {
  yourMessage: boolean;
  createdBy: string;
  creationDate: string;
  message: string;
  imageUrl: string | null;

  constructor(obj?: any) {
    // Zuweiseung der Werte des hineingegebenen Objektes zu den Feldern der Klasse.
    this.yourMessage = obj ? obj.yourMessage : false;
    this.createdBy = obj ? obj.createdBy: '';
    this.creationDate = obj ? obj.creationDate : ''; // if else Abfrage schneller geschrieben. Wenn das Objekt existiert, dann obj.firstname und sonst ein leerer String.
    this.message = obj ? obj.message : '';
    this.imageUrl = obj?.imageUrl ?? null;
  }

  public toJSON() {
    return {
      yourMessage: this.yourMessage,
      createdBy: this.createdBy,
      creationDate: this.creationDate,
      message: this.message,
      imageUrl: this.imageUrl,
    };
  }
}
