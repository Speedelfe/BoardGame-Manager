namespace BoardGameManager

module Types =
    open System

    type GameGenre =
        | Strategy
        | Card
        | Raetsel
        | Wuerfel
        | Enginebuilder
        | Party
        | Other

    type ShelfName =
        | WohnwandLinks
        | WohnwandRechts
        | SofaSchrank
        | BueroRegal

    type Game =
        {
            // Feste, eindeutige Kennung. Ändert sich nie, auch nicht beim Umbenennen.
            id: Guid
            name: string
            playerNumbers: int
        //   playTime: float
        //   lastPlayed: DateTime option
        //   genre: GameGenre
        //   secondaryGenre: GameGenre list option
        //   shelf: string
        //   description: string option
        }

    // Was gerade im Formular (neues Spiel oder Spiel bearbeiten) eingetippt ist.
    // Beides bleibt erst einmal Text. Ob die Spieleranzahl wirklich eine Zahl ist,
    // prüfen wir beim Speichern (siehe GameFunctions.validateGameForm).
    type GameForm =
        {
            nameInput: string
            playerNumbersInput: string
            error: string option
            // None = neues Spiel anlegen
            // Some game = dieses Spiel wird bearbeitet (so wie es vorher war)
            editing: Game option
        }

    type GameSaveStructure = { gameList: Game list }

    type Shelf = { name: ShelfName; games: Game list }

    // Wo wir beim Löschen des ausgewählten Spiels gerade stehen
    type DeleteState =
        | NotAsked // nichts passiert, normale Detailansicht
        | Confirming // "Wirklich löschen?" wird angezeigt
        | DeleteFailed of string // Löschen hat nicht geklappt, mit Fehlermeldung

    type Msg =
        | ShowDetail of Game
        | ShowNewGame
        | EditChosenGame
        | FormNameChanged of string
        | FormPlayerNumbersChanged of string
        | SaveForm
        | CancelForm
        // Antwort auf die Frage "Änderungen verwerfen?"
        | ConfirmDiscard
        | CancelDiscard
        | AskDeleteChosenGame
        | ConfirmDelete
        | CancelDelete

    type State =
        {
            gameList: Game list
            chosenGame: Game option
            formView: bool
            form: GameForm
            // Fehler beim Laden der Datei. Solange es einen gibt, ist Speichern gesperrt,
            // damit die (vielleicht nur kaputte) Datei nicht überschrieben wird.
            loadError: string option
            deleteState: DeleteState
            // Wartet auf die Antwort zu "Änderungen verwerfen?":
            // die Nachricht, die das offene Formular mit ungespeicherten Eingaben schließen würde.
            pendingMsg: Msg option
        }
