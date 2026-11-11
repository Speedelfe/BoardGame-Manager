namespace BoardGameManager

open System
open System.Globalization
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

    // Wurde im Formular etwas eingetippt, das noch nicht gespeichert ist?
    // Verglichen wird mit dem Stand, mit dem das Formular geöffnet wurde.
    let formHasChanges (form: GameForm) =
        let original =
            match form.editing with
            | None -> emptyForm ()
            | Some game -> formFromGame game

        form.nameInput <> original.nameInput
        || form.playerNumbersInput <> original.playerNumbersInput

    // Prüft die Eingaben aus dem Formular.
    // Ergebnis ist entweder Ok mit dem fertigen Spiel oder Error mit einer Fehlermeldung.
    let validateGameForm (existingGames: Game list) (form: GameForm) : Result<Game, string> =
        let name = form.nameInput.Trim()

        // Beim Bearbeiten behält das Spiel seine id, ein neues Spiel bekommt eine neue
        let id =
            match form.editing with
            | Some original -> original.id
            | None -> Guid.NewGuid()

        // Beim Bearbeiten darf das Spiel seinen eigenen Namen behalten,
        // deshalb lassen wir es beim Suchen nach doppelten Namen weg.
        let otherGames = existingGames |> List.filter (fun game -> game.id <> id)

        let alreadyExists =
            otherGames
            |> List.exists (fun game -> String.Equals(game.name, name, StringComparison.OrdinalIgnoreCase))

        match Int32.TryParse(form.playerNumbersInput.Trim()) with
        | _ when name = "" -> Error "Bitte gib einen Spielnamen ein."
        | _ when alreadyExists -> Error $"Das Spiel \"{name}\" gibt es schon."
        | false, _ -> Error "Die Spieleranzahl muss eine Zahl sein."
        | true, number when number < 1 -> Error "Die Spieleranzahl muss mindestens 1 sein."
        | true, number ->
            Ok
                {
                    id = id
                    name = name
                    playerNumbers = number
                }

    // Prüft die ids einer geladenen Spieleliste:
    // keine leere id (lauter Nullen) und keine id doppelt.
    // Ergebnis ist Ok mit der unveränderten Liste oder Error mit einer Fehlermeldung.
    let validateGameIds (games: Game list) : Result<Game list, string> =
        let emptyIdGames = games |> List.filter (fun game -> game.id = Guid.Empty)

        let duplicateIds =
            games
            |> List.groupBy (fun game -> game.id)
            |> List.filter (fun (_, gamesWithId) -> gamesWithId.Length > 1)

        let names (gameList: Game list) =
            gameList |> List.map (fun game -> $"\"{game.name}\"") |> String.concat ", "

        if not emptyIdGames.IsEmpty then
            Error $"Diese Spiele haben eine leere ID: {names emptyIdGames}"
        elif not duplicateIds.IsEmpty then
            let details =
                duplicateIds
                |> List.map (fun (id, gamesWithId) -> $"{names gamesWithId} (ID {id})")
                |> String.concat "; "

            Error $"Diese Spiele haben die gleiche ID: {details}"
        else
            Ok games

    // Prüft den Inhalt einer geladenen Spieleliste mit den gleichen Regeln wie das Formular:
    // kein leerer Name, Spieleranzahl mindestens 1 und kein Name doppelt.
    // Ergebnis ist Ok mit der unveränderten Liste oder Error mit einer Fehlermeldung.
    let validateGameContents (games: Game list) : Result<Game list, string> =
        let namelessGames =
            games |> List.filter (fun game -> String.IsNullOrWhiteSpace game.name)

        let wrongPlayerNumbers = games |> List.filter (fun game -> game.playerNumbers < 1)

        if not namelessGames.IsEmpty then
            let ids =
                namelessGames |> List.map (fun game -> string game.id) |> String.concat ", "

            Error $"Diese Spiele haben keinen Namen (ID): {ids}"
        elif not wrongPlayerNumbers.IsEmpty then
            let details =
                wrongPlayerNumbers
                |> List.map (fun game -> $"\"{game.name}\" ({game.playerNumbers})")
                |> String.concat ", "

            Error $"Diese Spiele haben eine ungültige Spieleranzahl: {details}"
        else
            // Groß-/Kleinschreibung und Leerzeichen am Rand sind egal, wie im Formular
            let duplicateNames =
                games
                |> List.groupBy (fun game -> game.name.Trim().ToUpperInvariant())
                |> List.filter (fun (_, gamesWithName) -> gamesWithName.Length > 1)
                |> List.map (fun (_, gamesWithName) -> $"\"{gamesWithName.Head.name.Trim()}\"")

            if not duplicateNames.IsEmpty then
                let details = duplicateNames |> String.concat ", "
                Error $"Diese Spielnamen gibt es mehrfach: {details}"
            else
                Ok games

    // Alle Prüfungen für eine geladene Spieleliste: erst die ids, dann der Inhalt.
    // Beim ersten Fehler wird nicht weitergeprüft.
    let validateLoadedGames (games: Game list) : Result<Game list, string> =
        games |> validateGameIds |> Result.bind validateGameContents

    // Deutsche Sortierregeln, unabhängig von der Spracheinstellung des Rechners
    let private germanCulture = CultureInfo.GetCultureInfo "de-DE"

    // Spiele alphabetisch nach Namen sortieren:
    // Groß-/Kleinschreibung egal, Umlaute wie im Wörterbuch (Ä bei A).
    let sortByName (games: Game list) =
        games
        |> List.sortWith (fun a b -> String.Compare(a.name, b.name, germanCulture, CompareOptions.IgnoreCase))

    // Spiel mit dieser id aus der Liste entfernen
    let removeGame (existingGames: Game list) (game: Game) =
        existingGames |> List.filter (fun g -> g.id <> game.id)

    // Neues Spiel hinten anhängen oder das bearbeitete Spiel (gleiche id) an seiner Stelle ersetzen
    let applyForm (existingGames: Game list) (game: Game) =
        if existingGames |> List.exists (fun g -> g.id = game.id) then
            existingGames |> List.map (fun g -> if g.id = game.id then game else g)
        else
            List.append existingGames [ game ]
