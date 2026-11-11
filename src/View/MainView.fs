namespace BoardGameManager

module MainView =
    open Avalonia.Controls
    open Avalonia.FuncUI
    open Avalonia.FuncUI.DSL
    open Avalonia.FuncUI.Types
    open Avalonia.Layout
    open Avalonia.Media

    open BoardGameManager.Types
    open BoardGameManager.Functions
    open BoardGameManager.GameFunctions


    // Beim Start die gespeicherte Spieleliste laden
    let init () : State =
        let gameList, loadError =
            match loadFile gameDataPath with
            | Ok games -> games, None
            | Error message -> [], Some message

        {
            gameList = gameList
            choosenGame = None
            formView = false
            form = emptyForm ()
            loadError = loadError
            deleteState = NotAsked
        }

    // Fehlermeldung im Formular setzen
    let private withFormError message state =
        { state with
            form =
                { state.form with
                    error = Some message
                }
        }

    let update msg state =
        match msg with
        | ShowDetail game ->
            { state with
                choosenGame = Some game
                formView = false
                deleteState = NotAsked
            }
        | ShowNewGame ->
            { state with
                choosenGame = None
                formView = true
                form = emptyForm ()
                deleteState = NotAsked
            }
        // Das gerade ausgewählte Spiel ins Formular laden.
        // Es bleibt in der Liste markiert, damit man sieht, was man bearbeitet.
        | EditChoosenGame ->
            match state.choosenGame with
            | None -> state
            | Some game ->
                { state with
                    formView = true
                    form = formFromGame game
                    deleteState = NotAsked
                }
        // Bei jeder Eingabe merken wir uns den Text und blenden einen alten Fehler aus
        | FormNameChanged text ->
            { state with
                form =
                    { state.form with
                        nameInput = text
                        error = None
                    }
            }
        | FormPlayerNumbersChanged text ->
            { state with
                form =
                    { state.form with
                        playerNumbersInput = text
                        error = None
                    }
            }
        // Beim Bearbeiten zurück zu den Details des Spiels, sonst einfach Formular schließen
        | CancelForm ->
            { state with
                choosenGame = state.form.editing
                formView = false
                form = emptyForm ()
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
                    saveFile gameDataPath newGameList
                    // Formular schließen und das gespeicherte Spiel gleich anzeigen
                    { state with
                        gameList = newGameList
                        choosenGame = Some game
                        formView = false
                        form = emptyForm ()
                    }
                with ex ->
                    state |> withFormError $"Speichern hat nicht geklappt: {ex.Message}"
        // Löschen in zwei Schritten: erst nachfragen, dann wirklich löschen
        | AskDeleteChoosenGame -> { state with deleteState = Confirming }
        | CancelDelete -> { state with deleteState = NotAsked }
        | ConfirmDelete ->
            match state.choosenGame with
            | None -> state
            | Some game ->
                let newGameList = removeGame state.gameList game

                try
                    saveFile gameDataPath newGameList

                    { state with
                        gameList = newGameList
                        choosenGame = None
                        deleteState = NotAsked
                    }
                with ex ->
                    { state with
                        deleteState = DeleteFailed $"Löschen hat nicht geklappt: {ex.Message}"
                    }

    let gameItemView (game: Game) =
        TextBlock.create [ TextBlock.text game.name ]

    // Formular zum Anlegen oder Bearbeiten eines Spiels, rechts
    let formView (form: GameForm) dispatch : IView =
        StackPanel.create [
            StackPanel.dock Dock.Right
            StackPanel.width 300.
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
    // update weiß über state.choosenGame, welches Spiel gemeint ist.
    let private detailButtons (deleteState: DeleteState) dispatch : IView list =
        let normalButtons: IView list =
            [
                Button.create [ Button.content "Bearbeiten"; Button.onClick (fun _ -> dispatch EditChoosenGame) ]
                Button.create [ Button.content "Löschen"; Button.onClick (fun _ -> dispatch AskDeleteChoosenGame) ]
            ]

        let errorText (message: string) : IView =
            TextBlock.create [
                TextBlock.text message
                TextBlock.foreground Brushes.OrangeRed
                TextBlock.textWrapping TextWrapping.Wrap
            ]

        match deleteState with
        | NotAsked -> normalButtons
        | Confirming ->
            [
                TextBlock.create [ TextBlock.text "Wirklich löschen?"; TextBlock.verticalAlignment VerticalAlignment.Center ]
                Button.create [ Button.content "Ja, löschen"; Button.onClick (fun _ -> dispatch ConfirmDelete) ]
                Button.create [ Button.content "Abbrechen"; Button.onClick (fun _ -> dispatch CancelDelete) ]
            ]
        | DeleteFailed message -> errorText message :: normalButtons

    // Detail Infos eines Spieles, rechts
    let detailView (game: Game) (deleteState: DeleteState) dispatch : IView =
        DockPanel.create [
            DockPanel.dock Dock.Right
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
                    StackPanel.children [
                        TextBlock.create [ TextBlock.text $"Spieleranzahl {game.playerNumbers}" ]
                    ]
                ]
            ]
        ]

    let view state dispatch : IView =
        DockPanel.create [
            DockPanel.children [
                StackPanel.create [
                    // 'Menü'-Leiste, oben
                    StackPanel.dock Dock.Top
                    StackPanel.orientation Orientation.Horizontal
                    StackPanel.spacing 10.
                    StackPanel.children [
                        TextBlock.create [ TextBlock.text "Menü" ]
                        Button.create [ Button.content "New Game"; Button.onClick (fun _ -> dispatch ShowNewGame) ]
                    ]
                ]
                // Fehler beim Laden, unter dem Menü
                match state.loadError with
                | None -> ()
                | Some message ->
                    TextBlock.create [
                        TextBlock.dock Dock.Top
                        TextBlock.margin 5.
                        TextBlock.text message
                        TextBlock.foreground Brushes.OrangeRed
                        TextBlock.textWrapping TextWrapping.Wrap
                    ]
                // Liste der Spiele ,unter Menü, links
                ListBox.create [
                    ListBox.dock Dock.Left
                    ListBox.dataItems state.gameList
                    ListBox.itemTemplate (DataTemplateView<Game>.create gameItemView)
                    // Auswahl in der Liste passend zum ausgewählten Spiel halten.
                    // Ohne Auswahl (null) kann man danach jedes Spiel wieder anklicken.
                    ListBox.selectedItem (
                        match state.choosenGame with
                        | Some game -> box game
                        | None -> null
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
                    formView state.form dispatch
                else
                    match state.choosenGame with
                    | None -> ()
                    | Some game -> detailView game state.deleteState dispatch
            ]
        ]
