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
        | BüroRegal

    type GameJson =
        {
            name: string
            playerNumbers: int
            playTime: float
            lastPlayed: string
            genre: string
            secondaryGenre: string
            shelf: string
            description: string
        }

    type Game =
        {
            name: string
            playerNumbers: int
        //   playTime: float
        //   lastPlayed: DateTime option
        //   genre: GameGenre
        //   secondaryGenre: GameGenre list option
        //   shelf: string
        //   description: string option
        }

    // Was gerade im Formular "Neues Spiel" eingetippt ist.
    // Beides bleibt erst einmal Text. Ob die Spieleranzahl wirklich eine Zahl ist,
    // prüfen wir beim Speichern (siehe GameFunctions.validateNewGame).
    type newGame =
        {
            nameInput: string
            playerNumbersInput: string
            error: string option
        }

    type GameSaveStrukture = { gameList: Game list }

    type Shelf = { name: ShelfName; games: Game list }

    type State =
        {
            gameList: Game list
            choosenGame: Game option
            newGameView: bool
            newGame: newGame
        }

    type Msg =
        | ShowDetail of Game
        | ShowNewGame
        | NewGameNameChanged of string
        | NewGamePlayerNumbersChanged of string
        | SaveNewGame
        | CancelNewGame
