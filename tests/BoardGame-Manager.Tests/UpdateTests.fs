// Tests für den Programmablauf (MainView.updateWith und MainView.initWith):
// Was passiert mit dem Stand der App, wenn eine Nachricht kommt?
// Gespeichert wird immer in einen eigenen Testordner, nie in die echte Spielesammlung.
module BoardGameManager.Tests.UpdateTests

open System
open System.IO
open Xunit
open BoardGameManager.Types
open BoardGameManager.Functions
open BoardGameManager.GameFunctions
open BoardGameManager.MainView
open BoardGameManager.Tests.TestData
open BoardGameManager.Tests.FileTests

// Stand der App mit diesen Spielen, nichts ausgewählt, kein Formular offen
let stateWith (gameList: Game list) : State =
    {
        gameList = gameList
        chosenGame = None
        formView = false
        form = emptyForm ()
        loadError = None
        deleteState = NotAsked
        pendingMsg = None
    }

// Für Nachrichten, die nichts speichern dürfen: diese Datei darf nie entstehen
let private unusedPath =
    Path.Combine(AppContext.BaseDirectory, "testdata", "unbenutzt", "games.json")

// Mehrere Nachrichten nacheinander auf einen Stand anwenden
let private runAll dataPath (messages: Msg list) (state: State) =
    messages |> List.fold (fun current msg -> updateWith dataPath msg current) state

let private run messages state = runAll unusedPath messages state

// Stand, in dem "Dixit" gerade bearbeitet wird und der Name schon geändert wurde
let private editingDixitWithChanges () =
    stateWith games
    |> run [ ShowDetail dixit; EditChosenGame; FormNameChanged "Dixit Odyssey" ]

// ----- Start (initWith) -----

[<Fact>]
let ``Start ohne Datei: leere Liste und kein Fehler`` () =
    withTestFolder (fun folder ->
        let state = initWith (Path.Combine(folder, "games.json"))
        Assert.Empty state.gameList
        Assert.Equal(None, state.loadError)
        Assert.False state.formView)

[<Fact>]
let ``Start mit gespeicherter Liste lädt die Spiele`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        saveFile path games
        let state = initWith path
        Assert.Equal<Game list>(games, state.gameList)
        Assert.Equal(None, state.loadError))

[<Fact>]
let ``Start mit kaputter Datei: leere Liste und Ladefehler`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        File.WriteAllText(path, "kein json")
        let state = initWith path
        Assert.Empty state.gameList
        Assert.True state.loadError.IsSome)

// ----- Auswählen und Formular öffnen -----

[<Fact>]
let ``Spiel anklicken zeigt seine Details`` () =
    let state = stateWith games |> run [ ShowDetail azul ]
    Assert.Equal(Some azul, state.chosenGame)
    Assert.False state.formView

[<Fact>]
let ``Neues Spiel öffnet ein leeres Formular ohne Auswahl`` () =
    let state = stateWith games |> run [ ShowDetail azul; ShowNewGame ]
    Assert.True state.formView
    Assert.Equal(emptyForm (), state.form)
    Assert.Equal(None, state.chosenGame)

[<Fact>]
let ``Nach einem Ladefehler öffnet Neues Spiel kein Formular`` () =
    let broken =
        { stateWith [] with
            loadError = Some "kaputt"
        }

    Assert.Equal(broken, broken |> run [ ShowNewGame ])

[<Fact>]
let ``Bearbeiten füllt das Formular mit dem ausgewählten Spiel`` () =
    let state = stateWith games |> run [ ShowDetail azul; EditChosenGame ]
    Assert.True state.formView
    Assert.Equal(formFromGame azul, state.form)
    Assert.Equal(Some azul, state.chosenGame)

[<Fact>]
let ``Bearbeiten ohne ausgewähltes Spiel ändert nichts`` () =
    let state = stateWith games
    Assert.Equal(state, state |> run [ EditChosenGame ])

[<Fact>]
let ``Tippen merkt sich die Eingaben und blendet einen alten Fehler aus`` () =
    let withError = stateWith games |> run [ ShowNewGame; SaveForm ] // leerer Name ergibt einen Fehler

    Assert.True withError.form.error.IsSome

    let state =
        withError |> run [ FormNameChanged "Monopoly"; FormPlayerNumbersChanged "4" ]

    Assert.Equal("Monopoly", state.form.nameInput)
    Assert.Equal("4", state.form.playerNumbersInput)
    Assert.Equal(None, state.form.error)

[<Fact>]
let ``Abbrechen beim Bearbeiten führt zurück zu den Details`` () =
    let state = editingDixitWithChanges () |> run [ CancelForm ]
    Assert.False state.formView
    Assert.Equal(Some dixit, state.chosenGame)
    Assert.Equal<Game list>(games, state.gameList)

[<Fact>]
let ``Abbrechen bei einem neuen Spiel schließt das Formular ohne Auswahl`` () =
    let state =
        stateWith games |> run [ ShowNewGame; FormNameChanged "Monopoly"; CancelForm ]

    Assert.False state.formView
    Assert.Equal(None, state.chosenGame)

// ----- Speichern -----

[<Fact>]
let ``Speichern eines neuen Spiels: in Liste, in Datei und ausgewählt`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")

        let state =
            stateWith games
            |> runAll
                path
                [
                    ShowNewGame
                    FormNameChanged "Monopoly"
                    FormPlayerNumbersChanged "4"
                    SaveForm
                ]

        Assert.False state.formView
        Assert.Equal<string list>([ "Dixit"; "Azul"; "Flügelschlag"; "Monopoly" ], names state.gameList)
        Assert.Equal("Monopoly", state.chosenGame.Value.name)
        Assert.Equal(Ok state.gameList, loadFile path))

[<Fact>]
let ``Speichern eines bearbeiteten Spiels ersetzt es in Liste und Datei`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        let state = editingDixitWithChanges () |> runAll path [ SaveForm ]
        Assert.False state.formView
        Assert.Equal<string list>([ "Dixit Odyssey"; "Azul"; "Flügelschlag" ], names state.gameList)
        Assert.Equal(dixit.id, state.chosenGame.Value.id)
        Assert.Equal(Ok state.gameList, loadFile path))

[<Fact>]
let ``Speichern mit ungültigen Eingaben zeigt den Fehler und schreibt nichts`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")

        let state =
            stateWith games
            |> runAll path [ ShowNewGame; FormNameChanged "Dixit"; SaveForm ]

        Assert.True state.formView
        Assert.Equal(Some "Das Spiel \"Dixit\" gibt es schon.", state.form.error)
        Assert.Equal<Game list>(games, state.gameList)
        Assert.False(File.Exists path))

[<Fact>]
let ``Nach einem Ladefehler ist Speichern gesperrt und die Datei bleibt unberührt`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        File.WriteAllText(path, "kein json")

        // Das Formular kann man in diesem Zustand gar nicht öffnen, wir erzwingen es hier
        let state =
            { initWith path with
                formView = true
                form =
                    { emptyForm () with
                        nameInput = "Monopoly"
                        playerNumbersInput = "4"
                    }
            }
            |> runAll path [ SaveForm ]

        Assert.StartsWith("Speichern ist gesperrt", state.form.error.Value)
        Assert.Equal("kein json", File.ReadAllText path))

[<Fact>]
let ``Schlägt das Speichern fehl, bleibt das Formular mit Fehlermeldung offen`` () =
    withTestFolder (fun folder ->
        // Der "Ordner" der Spieleliste ist in Wirklichkeit eine Datei, darum klappt das Speichern nicht
        let blocker = Path.Combine(folder, "blockiert")
        File.WriteAllText(blocker, "")
        let path = Path.Combine(blocker, "games.json")

        let state =
            stateWith games
            |> runAll
                path
                [
                    ShowNewGame
                    FormNameChanged "Monopoly"
                    FormPlayerNumbersChanged "4"
                    SaveForm
                ]

        Assert.True state.formView
        Assert.StartsWith("Speichern hat nicht geklappt", state.form.error.Value)
        Assert.Equal<Game list>(games, state.gameList))

// ----- Ungespeicherte Eingaben: "Änderungen verwerfen?" -----

[<Fact>]
let ``Anderes Spiel anklicken mit ungespeicherten Eingaben fragt erst nach`` () =
    let before = editingDixitWithChanges ()
    let state = before |> run [ ShowDetail azul ]
    Assert.Equal(Some(ShowDetail azul), state.pendingMsg)
    Assert.True state.formView
    Assert.Equal(before.form, state.form)
    Assert.Equal(Some dixit, state.chosenGame)

[<Fact>]
let ``Neues Spiel mit ungespeicherten Eingaben fragt erst nach`` () =
    let state = editingDixitWithChanges () |> run [ ShowNewGame ]
    Assert.Equal(Some ShowNewGame, state.pendingMsg)
    Assert.Equal("Dixit Odyssey", state.form.nameInput)

[<Fact>]
let ``Ja, verwerfen: das angeklickte Spiel wird angezeigt`` () =
    let state = editingDixitWithChanges () |> run [ ShowDetail azul; ConfirmDiscard ]
    Assert.Equal(None, state.pendingMsg)
    Assert.False state.formView
    Assert.Equal(Some azul, state.chosenGame)
    Assert.Equal<Game list>(games, state.gameList)

[<Fact>]
let ``Ja, verwerfen nach Neues Spiel: ein leeres Formular wird geöffnet`` () =
    let state = editingDixitWithChanges () |> run [ ShowNewGame; ConfirmDiscard ]
    Assert.Equal(None, state.pendingMsg)
    Assert.True state.formView
    Assert.Equal(emptyForm (), state.form)
    Assert.Equal(None, state.chosenGame)

[<Fact>]
let ``Nein: das Formular bleibt mit den Eingaben offen`` () =
    let before = editingDixitWithChanges ()
    let state = before |> run [ ShowDetail azul; CancelDiscard ]
    Assert.Equal(before, state)

[<Fact>]
let ``Ohne Änderungen wird ohne Nachfrage gewechselt`` () =
    let state =
        stateWith games |> run [ ShowDetail dixit; EditChosenGame; ShowDetail azul ]

    Assert.Equal(None, state.pendingMsg)
    Assert.False state.formView
    Assert.Equal(Some azul, state.chosenGame)

[<Fact>]
let ``Klick auf das Spiel, das gerade bearbeitet wird, lässt das Formular offen`` () =
    let before = editingDixitWithChanges ()
    Assert.Equal(before, before |> run [ ShowDetail dixit ])
    // Eine offene Nachfrage ist damit erledigt
    Assert.Equal(before, before |> run [ ShowDetail azul; ShowDetail dixit ])

[<Fact>]
let ``Verwerfen-Antwort ohne offene Nachfrage ändert nichts`` () =
    let before = editingDixitWithChanges ()
    Assert.Equal(before, before |> run [ ConfirmDiscard ])
    Assert.Equal(before, before |> run [ CancelDiscard ])

// ----- Löschen -----

[<Fact>]
let ``Löschen fragt erst nach und lässt sich abbrechen`` () =
    let asked = stateWith games |> run [ ShowDetail azul; AskDeleteChosenGame ]
    Assert.Equal(Confirming, asked.deleteState)

    let cancelled = asked |> run [ CancelDelete ]
    Assert.Equal(NotAsked, cancelled.deleteState)
    Assert.Equal<Game list>(games, cancelled.gameList)

[<Fact>]
let ``Bestätigtes Löschen entfernt das Spiel aus Liste und Datei`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")
        saveFile path games

        let state =
            stateWith games
            |> runAll path [ ShowDetail azul; AskDeleteChosenGame; ConfirmDelete ]

        Assert.Equal<string list>([ "Dixit"; "Flügelschlag" ], names state.gameList)
        Assert.Equal(None, state.chosenGame)
        Assert.Equal(NotAsked, state.deleteState)
        Assert.Equal(Ok state.gameList, loadFile path))

[<Fact>]
let ``Schlägt das Löschen fehl, bleibt das Spiel und es gibt eine Fehlermeldung`` () =
    withTestFolder (fun folder ->
        let blocker = Path.Combine(folder, "blockiert")
        File.WriteAllText(blocker, "")
        let path = Path.Combine(blocker, "games.json")

        let state =
            stateWith games
            |> runAll path [ ShowDetail azul; AskDeleteChosenGame; ConfirmDelete ]

        Assert.Equal<Game list>(games, state.gameList)
        Assert.Equal(Some azul, state.chosenGame)

        match state.deleteState with
        | DeleteFailed message -> Assert.StartsWith("Löschen hat nicht geklappt", message)
        | other -> failwith $"DeleteFailed erwartet, aber: {other}")

[<Fact>]
let ``Nach einem Ladefehler ist Löschen gesperrt`` () =
    withTestFolder (fun folder ->
        let path = Path.Combine(folder, "games.json")

        let state =
            { stateWith games with
                loadError = Some "kaputt"
                chosenGame = Some azul
            }
            |> runAll path [ AskDeleteChosenGame; ConfirmDelete ]

        Assert.Equal<Game list>(games, state.gameList)
        Assert.False(File.Exists path)

        match state.deleteState with
        | DeleteFailed message -> Assert.StartsWith("Löschen ist gesperrt", message)
        | other -> failwith $"DeleteFailed erwartet, aber: {other}")

[<Fact>]
let ``Löschen bestätigen ohne ausgewähltes Spiel ändert nichts`` () =
    let state = stateWith games
    Assert.Equal(state, state |> run [ ConfirmDelete ])
    Assert.False(File.Exists unusedPath)
