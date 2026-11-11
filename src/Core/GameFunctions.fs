namespace BoardGameManager

open System
open Types

module GameFunctions =
    // Leeres Formular für ein neues Spiel
    let emptyForm () =
        {
            nameInput = ""
            playerNumbersInput = ""
            error = None
            editing = None
        }

    // Formular mit den Daten eines vorhandenen Spiels, zum Bearbeiten
    let formFromGame (game: Game) =
        {
            nameInput = game.name
            playerNumbersInput = string game.playerNumbers
            error = None
            editing = Some game
        }

    // Prüft die Eingaben aus dem Formular.
    // Ergebnis ist entweder Ok mit dem fertigen Spiel oder Error mit einer Fehlermeldung.
    let validateGameForm (existingGames: Game list) (form: GameForm) : Result<Game, string> =
        let name = form.nameInput.Trim()

        // Beim Bearbeiten darf das Spiel seinen eigenen Namen behalten,
        // deshalb lassen wir es beim Suchen nach doppelten Namen weg.
        let otherGames =
            existingGames |> List.filter (fun game -> Some game <> form.editing)

        let alreadyExists =
            otherGames
            |> List.exists (fun game -> String.Equals(game.name, name, StringComparison.OrdinalIgnoreCase))

        match Int32.TryParse(form.playerNumbersInput.Trim()) with
        | _ when name = "" -> Error "Bitte gib einen Spielnamen ein."
        | _ when alreadyExists -> Error $"Das Spiel \"{name}\" gibt es schon."
        | false, _ -> Error "Die Spieleranzahl muss eine Zahl sein."
        | true, number when number < 1 -> Error "Die Spieleranzahl muss mindestens 1 sein."
        | true, number -> Ok { name = name; playerNumbers = number }

    // Neues Spiel hinten anhängen oder das bearbeitete Spiel an seiner Stelle ersetzen
    let applyForm (existingGames: Game list) (form: GameForm) (game: Game) =
        match form.editing with
        | None -> List.append existingGames [ game ]
        | Some original -> existingGames |> List.map (fun g -> if g = original then game else g)
