namespace BoardGameManager

open System
open Types

module GameFunctions =
    // Leeres Formular für ein neues Spiel
    let createNewPossibleGame () =
        {
            nameInput = ""
            playerNumbersInput = ""
            error = None
        }

    // Prüft die Eingaben aus dem Formular.
    // Ergebnis ist entweder Ok mit dem fertigen Spiel oder Error mit einer Fehlermeldung.
    let validateNewGame (existingGames: Game list) (form: newGame) : Result<Game, string> =
        let name = form.nameInput.Trim()

        let alreadyExists =
            existingGames
            |> List.exists (fun game -> String.Equals(game.name, name, StringComparison.OrdinalIgnoreCase))

        match Int32.TryParse(form.playerNumbersInput.Trim()) with
        | _ when name = "" -> Error "Bitte gib einen Spielnamen ein."
        | _ when alreadyExists -> Error $"Das Spiel \"{name}\" gibt es schon."
        | false, _ -> Error "Die Spieleranzahl muss eine Zahl sein."
        | true, number when number < 1 -> Error "Die Spieleranzahl muss mindestens 1 sein."
        | true, number -> Ok { name = name; playerNumbers = number }
