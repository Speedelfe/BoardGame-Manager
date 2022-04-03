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
        { name: string
          playerNumbers: int
          playTime: float
          lastPlayed: string
          genre: string
          secondaryGenre: string
          shelf: string
          description: string }

    type Game =
        { name: string
          playerNumbers: int
        //   playTime: float
        //   lastPlayed: DateTime option
        //   genre: GameGenre
        //   secondaryGenre: GameGenre list option
        //   shelf: string
        //   description: string option
         }

    type Shelf = { name: ShelfName; games: Game list }

    type State =
        { gameList: Game list
          choosenGame: Game option }

    type Msg = ShowDetail of Game
