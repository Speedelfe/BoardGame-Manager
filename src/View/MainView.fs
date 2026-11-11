namespace BoardGameManager

module MainView =
    open Avalonia
    open Avalonia.Controls
    open Avalonia.FuncUI
    open Avalonia.FuncUI.DSL
    open Avalonia.FuncUI.Types
    open Avalonia.Layout
    open Avalonia.Media

    open BoardGameManager.Types
    open BoardGameManager.Functions
    open BoardGameManager.GameFunctions

    // Beim Start die gespeicherte Spieleliste laden.
    // dataPath ist die Datei der Spieleliste. Tests geben hier eine eigene Datei an.
    let initWith (dataPath: string) : State =
        let gameList, loadError =
            match loadFile dataPath with
            | Ok games -> games, None
            | Error message -> [], Some message

        {
            gameList = gameList
            chosenGame = None
            formView = false
            form = emptyForm ()
            loadError = loadError
            deleteState = NotAsked
            pendingMsg = None
        }

    // Die App selbst lädt immer die echte Spieleliste
    let init () : State = initWith gameDataPath

    // Formular ist offen und enthält Eingaben, die noch nicht gespeichert sind
    let private hasUnsavedInput state =
        state.formView && formHasChanges state.form

    // Fehlermeldung im Formular setzen
    let private withFormError message state = {
        state with
            form = { state.form with error = Some message }
    }

    // Der Programmablauf: aus einer Nachricht und dem alten Stand wird der neue Stand.
    // dataPath ist die Datei der Spieleliste. Tests geben hier eine eigene Datei an.
    let rec updateWith (dataPath: string) msg state =
        match msg with
        // Nach einem Ladefehler kann nichts gespeichert werden, also auch kein Formular öffnen
        | ShowNewGame when state.loadError.IsSome -> state
        // Klick auf das Spiel, das gerade bearbeitet wird: dort sind wir schon.
        // Das Formular bleibt offen, eine offene Nachfrage ist damit erledigt.
        // (Kommt auch, wenn die Liste nach "Nein" ihre Markierung zurücksetzt.)
        | ShowDetail game when
            state.formView
            && state.form.editing |> Option.exists (fun edited -> edited.id = game.id)
              ->
              { state with pendingMsg = None }
        // Das Formular hat ungespeicherte Eingaben: nicht einfach schließen,
        // sondern die Nachricht merken und erst nachfragen.
        | ShowDetail _
        | ShowNewGame when hasUnsavedInput state -> { state with pendingMsg = Some msg }
        | ShowDetail game -> {
            state with
                chosenGame = Some game
                formView = false
                deleteState = NotAsked
                pendingMsg = None
          }
        | ShowNewGame -> {
            state with
                chosenGame = None
                formView = true
                form = emptyForm ()
                deleteState = NotAsked
                pendingMsg = None
          }
        // "Ja, verwerfen": Formular schließen und die gemerkte Nachricht jetzt ausführen
        | ConfirmDiscard ->
            match state.pendingMsg with
            | None -> state
            | Some pending ->
                updateWith dataPath pending {
                    state with
                        formView = false
                        pendingMsg = None
                }
        // "Nein": Formular bleibt offen, wie es ist
        | CancelDiscard -> { state with pendingMsg = None }
        // Das gerade ausgewählte Spiel ins Formular laden.
        // Es bleibt in der Liste markiert, damit man sieht, was man bearbeitet.
        | EditChosenGame ->
            match state.chosenGame with
            | None -> state
            | Some game -> {
                state with
                    formView = true
                    form = formFromGame game
                    deleteState = NotAsked
              }
        // Bei jeder Eingabe merken wir uns den Text und blenden einen alten Fehler aus
        | FormNameChanged text -> {
            state with
                form = {
                    state.form with
                        nameInput = text
                        error = None
                }
          }
        | FormPlayerNumbersChanged text -> {
            state with
                form = {
                    state.form with
                        playerNumbersInput = text
                        error = None
                }
          }
        // Beim Bearbeiten zurück zu den Details des Spiels, sonst einfach Formular schließen
        | CancelForm -> {
            state with
                chosenGame = state.form.editing
                formView = false
                form = emptyForm ()
                pendingMsg = None
          }
        | SaveForm when state.loadError.IsSome ->
            state
            |> withFormError "Speichern ist gesperrt, weil die Spieleliste beim Start nicht gelesen werden konnte."
        | SaveForm ->
            match validateGameForm state.gameList state.form with
            | Error message -> state |> withFormError message
            | Ok game ->
                let newGameList = applyForm state.gameList game

                try
                    saveFile dataPath newGameList
                    // Formular schließen und das gespeicherte Spiel gleich anzeigen
                    {
                        state with
                            gameList = newGameList
                            chosenGame = Some game
                            formView = false
                            form = emptyForm ()
                            pendingMsg = None
                    }
                with ex ->
                    state |> withFormError $"Speichern hat nicht geklappt: {ex.Message}"
        // Löschen in zwei Schritten: erst nachfragen, dann wirklich löschen
        | AskDeleteChosenGame -> { state with deleteState = Confirming }
        | CancelDelete -> { state with deleteState = NotAsked }
        // Wie beim Speichern: nach einem Ladefehler wird die Datei nicht angefasst
        | ConfirmDelete when state.loadError.IsSome -> {
            state with
                deleteState =
                    DeleteFailed "Löschen ist gesperrt, weil die Spieleliste beim Start nicht gelesen werden konnte."
          }
        | ConfirmDelete ->
            match state.chosenGame with
            | None -> state
            | Some game ->
                let newGameList = removeGame state.gameList game

                try
                    saveFile dataPath newGameList

                    {
                        state with
                            gameList = newGameList
                            chosenGame = None
                            deleteState = NotAsked
                    }
                with ex -> {
                    state with
                        deleteState = DeleteFailed $"Löschen hat nicht geklappt: {ex.Message}"
                }

    // Die App selbst arbeitet immer mit der echten Spieleliste
    let update msg state = updateWith gameDataPath msg state

    let gameItemView (game: Game) =
        TextBlock.create [ TextBlock.text game.name ]

    // Formular zum Anlegen oder Bearbeiten eines Spiels, rechts
    // askDiscard = true: statt Speichern/Abbrechen wird "Änderungen verwerfen?" gefragt
    let formView (form: GameForm) (askDiscard: bool) dispatch : IView =
        StackPanel.create [
            StackPanel.dock Dock.Right
            StackPanel.width 300.
            // Links ausrichten wie die Detailansicht, sonst steht das Formular mittig im freien Platz
            StackPanel.horizontalAlignment HorizontalAlignment.Left
            StackPanel.margin 10.
            StackPanel.orientation Orientation.Vertical
            StackPanel.spacing 5.
            StackPanel.children [
                TextBlock.create [
                    TextBlock.fontSize 15.
                    TextBlock.text (
                        match form.editing with
                        | None -> "Trage ein neues Spiel ein"
                        | Some original -> $"\"{original.name}\" bearbeiten"
                    )
                ]
                TextBlock.create [ TextBlock.text "Spielname" ]
                TextBox.create [
                    TextBox.placeHolderText "Spielname"
                    TextBox.text form.nameInput
                    TextBox.onTextChanged (fun text -> dispatch (FormNameChanged text))
                ]
                TextBlock.create [ TextBlock.text "Spieleranzahl" ]
                TextBox.create [
                    TextBox.placeHolderText "Spieleranzahl"
                    TextBox.text form.playerNumbersInput
                    TextBox.onTextChanged (fun text -> dispatch (FormPlayerNumbersChanged text))
                ]
                // Fehlermeldung nur anzeigen, wenn es eine gibt
                match form.error with
                | None -> ()
                | Some message ->
                    TextBlock.create [
                        TextBlock.text message
                        TextBlock.foreground Brushes.OrangeRed
                        TextBlock.textWrapping TextWrapping.Wrap
                    ]
                if askDiscard then
                    TextBlock.create [
                        TextBlock.text "Du hast ungespeicherte Eingaben. Änderungen verwerfen?"
                        TextBlock.textWrapping TextWrapping.Wrap
                    ]

                    StackPanel.create [
                        StackPanel.orientation Orientation.Horizontal
                        StackPanel.spacing 10.
                        StackPanel.children [
                            Button.create [
                                Button.content "Ja, verwerfen"
                                Button.onClick (fun _ -> dispatch ConfirmDiscard)
                            ]
                            Button.create [
                                Button.content "Nein, weiter bearbeiten"
                                Button.onClick (fun _ -> dispatch CancelDiscard)
                            ]
                        ]
                    ]
                else
                    StackPanel.create [
                        StackPanel.orientation Orientation.Horizontal
                        StackPanel.spacing 10.
                        StackPanel.children [
                            Button.create [ Button.content "Speichern"; Button.onClick (fun _ -> dispatch SaveForm) ]
                            Button.create [ Button.content "Abbrechen"; Button.onClick (fun _ -> dispatch CancelForm) ]
                        ]
                    ]
            ]
        ]

    // Knöpfe unten in der Detailansicht.
    // Sie schicken nur Nachrichten, nicht das Spiel selbst:
    // update weiß über state.chosenGame, welches Spiel gemeint ist.
    let private detailButtons (deleteState: DeleteState) dispatch : IView list =
        let normalButtons: IView list = [
            Button.create [
                Button.content "Bearbeiten"
                Button.onClick (fun _ -> dispatch EditChosenGame)
            ]
            Button.create [
                Button.content "Löschen"
                Button.onClick (fun _ -> dispatch AskDeleteChosenGame)
            ]
        ]

        let errorText (message: string) : IView =
            TextBlock.create [
                TextBlock.text message
                TextBlock.foreground Brushes.OrangeRed
                TextBlock.textWrapping TextWrapping.Wrap
            ]

        match deleteState with
        | NotAsked -> normalButtons
        | Confirming -> [
            TextBlock.create [
                TextBlock.text "Wirklich löschen?"
                TextBlock.verticalAlignment VerticalAlignment.Center
            ]
            Button.create [
                Button.content "Ja, löschen"
                Button.onClick (fun _ -> dispatch ConfirmDelete)
            ]
            Button.create [ Button.content "Abbrechen"; Button.onClick (fun _ -> dispatch CancelDelete) ]
          ]
        | DeleteFailed message -> errorText message :: normalButtons

    // Detail Infos eines Spieles, rechts
    let detailView (game: Game) (deleteState: DeleteState) dispatch : IView =
        DockPanel.create [
            DockPanel.dock Dock.Right
            DockPanel.margin 10.
            DockPanel.children [
                WrapPanel.create [
                    WrapPanel.dock Dock.Bottom
                    WrapPanel.orientation Orientation.Horizontal
                    WrapPanel.itemSpacing 10.
                    WrapPanel.children (detailButtons deleteState dispatch)
                ]
                StackPanel.create [
                    StackPanel.dock Dock.Top
                    StackPanel.orientation Orientation.Vertical
                    StackPanel.spacing 5.
                    StackPanel.children [
                        // Name des Spiels als Überschrift
                        TextBlock.create [
                            TextBlock.text game.name
                            TextBlock.fontSize 20.
                            TextBlock.fontWeight FontWeight.Bold
                            TextBlock.textWrapping TextWrapping.Wrap
                        ]
                        TextBlock.create [ TextBlock.text $"Spieler: {game.playerNumbers}" ]
                    ]
                ]
            ]
        ]

    let view state dispatch : IView =
        DockPanel.create [
            DockPanel.children [
                // Menüleiste oben, mit dünner Linie nach unten
                Border.create [
                    Border.dock Dock.Top
                    Border.padding 8.
                    Border.borderThickness (Thickness(0., 0., 0., 1.))
                    Border.borderBrush Brushes.Gray
                    Border.child (
                        StackPanel.create [
                            StackPanel.orientation Orientation.Horizontal
                            StackPanel.spacing 10.
                            StackPanel.children [
                                Button.create [
                                    Button.content "Neues Spiel"
                                    // Nach einem Ladefehler ausgegraut, weil Speichern dann gesperrt ist
                                    Button.isEnabled state.loadError.IsNone
                                    Button.onClick (fun _ -> dispatch ShowNewGame)
                                ]
                            ]
                        ]
                    )
                ]
                // Fehler beim Laden, unter dem Menü
                match state.loadError with
                | None -> ()
                | Some message ->
                    TextBlock.create [
                        TextBlock.dock Dock.Top
                        TextBlock.margin 10.
                        TextBlock.text (
                            message
                            + "\n\nSolange das so ist, können keine Spiele angelegt oder geändert werden, "
                            + "damit die Datei nicht überschrieben wird. "
                            + "Bitte die Datei reparieren oder wegschieben und die App neu starten."
                        )
                        TextBlock.foreground Brushes.OrangeRed
                        TextBlock.textWrapping TextWrapping.Wrap
                    ]
                // Liste der Spiele ,unter Menü, links
                ListBox.create [
                    ListBox.dock Dock.Left
                    ListBox.width 220.
                    ListBox.margin 10.
                    // Nur die Anzeige wird sortiert, die Datei behält die Reihenfolge des Anlegens
                    ListBox.dataItems (sortByName state.gameList)
                    ListBox.itemTemplate (DataTemplateView<Game>.create gameItemView)
                    // Auswahl in der Liste passend zum ausgewählten Spiel halten.
                    // Ohne Auswahl (null) kann man danach jedes Spiel wieder anklicken.
                    // Läuft gerade die Nachfrage "Änderungen verwerfen?" für ein angeklicktes Spiel,
                    // bleibt dieses markiert. Bei "Nein" springt die Markierung zurück.
                    ListBox.selectedItem (
                        match state.pendingMsg, state.chosenGame with
                        | Some(ShowDetail game), _ -> box game
                        | _, Some game -> box game
                        | _, None -> null
                    )
                    // Achtung: FuncUI richtet diese Funktion nur einmal ein. Sie darf deshalb
                    // nichts aus "state" benutzen (das wäre für immer der Stand vom Programmstart).
                    // Darum nehmen wir das angeklickte Spiel direkt und nicht seine Nummer in der Liste.
                    ListBox.onSelectedItemChanged (fun item ->
                        match item with
                        | :? Game as game -> dispatch (ShowDetail game)
                        | _ -> ())

                ]
                // Rechts entweder das Formular oder die Details des ausgewählten Spiels
                if state.formView then
                    formView state.form state.pendingMsg.IsSome dispatch
                else
                    match state.chosenGame with
                    // Leerer Platzhalter: Das letzte Element füllt den restlichen Platz.
                    // Ohne ihn wäre das die Liste, und sie stünde dann in der Mitte.
                    | None -> Panel.create []
                    | Some game -> detailView game state.deleteState dispatch
            ]
        ]
