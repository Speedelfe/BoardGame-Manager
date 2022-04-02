namespace BoardGameManager

module Types =

    type GameGenre =
        | "strategy"
        | "card"
        | "raetsel"
        | "wuerfel"
        | "enginebuilder"
        | "party"
        | "other"

    type ShelfName =
        | "Wohnwand-Links"
        | "Wohnwand-Rechts"
        | "Sofa-Schrank"
        | "Büro-Regal"

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
            name: string;
            playerNumbers: int
            playTime: float
            lastPlayed: Option DateTime
            genre: GameGenre
            secondaryGenre: Opion List<GameGenre>
            shelf: string
            description: Option string
        }

    type GameList =
        {
            games: list<Game>
        }

    type Shelf =
        {
            name: ShelfName;
            games: List<Game>
        }

