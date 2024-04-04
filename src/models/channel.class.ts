export class Channel {
  type: string;
  name: string;
  description: string;
  creationDate: number;
  createdBy: string;
  members: string[];

  constructor(obj?: any) {
    // Zuweiseung der Werte des hineingegebenen Objektes zu den Feldern der Klasse.
    this.type = obj ? obj.type : '';
    this.name = obj ? obj.name : ''; // if else Abfrage schneller geschrieben. Wenn das Objekt existiert, dann obj.firstname und sonst ein leerer String.
    this.description = obj ? obj.description : '';
    this.creationDate = obj ? obj.creationDate : '';
    this.createdBy = obj ? obj.createdBy : '';
    this.members = obj ? obj.members : '';
  }

  public toJSON() {
    return {
      type: this.type,
      name: this.name,
      description: this.description,
      creationDate: this.creationDate,
      createdBy: this.createdBy,
      members: this.members,
    };
  }
}
