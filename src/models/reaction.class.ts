export class Reaction {
    count: number;
    reaction: string;
    reactedBy: [];

    constructor(obj?: any) { // Zuweiseung der Werte des hineingegebenen Objektes zu den Feldern der Klasse.
        this.count = obj ? obj.count : "";
        this.reaction = obj ? obj.reaction : ""; // if else Abfrage schneller geschrieben. Wenn das Objekt existiert, dann obj.firstname und sonst ein leerer String.
        this.reactedBy = obj ? obj.reactedBy : "";
    }

    public toJSON() {
        return {
            'count': this.count,
            'reaction': this.reaction,
            'reactedBy': this.reactedBy,
        };
    }
}