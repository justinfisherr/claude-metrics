"""Album-level metadata curated for the app-logged ratings that arrived without it.

Keys match on artist + album substring. Personnel is the album/session lineup;
`player_source` records that it is album-level rather than a per-track credit.
"""

ALBUM_META = [
    {
        "artist": "Ahmad Jamal Trio", "album": "The Awakening", "year": 1970, "era": "Post-Bop", "label": "Impulse!",
        "key_players": ["Ahmad Jamal - piano", "Jamil Nasser - bass", "Frank Gant - drums"],
    },
    {
        "artist": "Alice Coltrane", "album": "Ptah The El Daoud", "year": 1970, "era": "Spiritual Jazz", "label": "Impulse!",
        "key_players": ["Alice Coltrane - piano, harp", "Pharoah Sanders - tenor saxophone, alto flute", "Joe Henderson - tenor saxophone, alto flute", "Ron Carter - bass", "Ben Riley - drums"],
    },
    {
        "artist": "Charlie Parker", "album": "April In Paris", "year": 1957, "era": "Bebop", "label": "Verve",
        "key_players": ["Charlie Parker - alto saxophone"],
    },
    {
        "artist": "Charlie Parker", "album": "Bird After Dark", "year": 1950, "era": "Bebop", "label": "Verve",
        "key_players": ["Charlie Parker - alto saxophone"],
    },
    {
        "artist": "Dexter Gordon", "album": "Dexter Blows Hot", "year": 1955, "era": "Hard Bop", "label": "Dootone",
        "key_players": ["Dexter Gordon - tenor saxophone", "Jimmy Robinson - trumpet", "Carl Perkins - piano", "Curtis Counce - bass", "Chuck Thompson - drums"],
    },
    {
        "artist": "Duke Ellington", "album": "Far East Suite", "year": 1967, "era": "Post-Bop", "label": "RCA Victor",
        "key_players": ["Duke Ellington - piano", "Billy Strayhorn - piano, arranger", "Cootie Williams - trumpet", "Cat Anderson - trumpet", "Johnny Hodges - alto saxophone", "Paul Gonsalves - tenor saxophone", "Harry Carney - baritone saxophone", "Lawrence Brown - trombone", "John Lamb - bass", "Rufus Jones - drums"],
    },
    {
        "artist": "Duke Ellington", "album": "Money Jungle", "year": 1962, "era": "Post-Bop", "label": "United Artists",
        "key_players": ["Duke Ellington - piano", "Charles Mingus - bass", "Max Roach - drums"],
    },
    {
        "artist": "Elvin Jones", "album": "Illumination!", "year": 1964, "era": "Post-Bop", "label": "Impulse!",
        "key_players": ["Elvin Jones - drums", "McCoy Tyner - piano", "Jimmy Garrison - bass", "Sonny Simmons - alto saxophone", "Prince Lasha - flute"],
    },
    {
        "artist": "Elvin Jones", "album": "Dear John C.", "year": 1965, "era": "Post-Bop", "label": "Impulse!",
        "key_players": ["Elvin Jones - drums", "Charlie Mariano - alto saxophone", "Roland Hanna - piano", "Richard Davis - bass"],
    },
    {
        "artist": "Herbie Hancock", "album": "Fat Albert Rotunda", "year": 1969, "era": "Soul/Funk", "label": "Warner Bros.",
        "key_players": ["Herbie Hancock - piano, electric piano", "Joe Henderson - tenor saxophone", "Johnny Coles - flugelhorn", "Garnett Brown - trombone", "Buster Williams - bass", "Albert Heath - drums"],
    },
    {
        "artist": "Herbie Hancock", "album": "Speak Like A Child", "year": 1968, "era": "Post-Bop", "label": "Blue Note",
        "key_players": ["Herbie Hancock - piano", "Thad Jones - flugelhorn", "Peter Phillips - bass trombone", "Jerry Dodgion - alto flute", "Ron Carter - bass", "Mickey Roker - drums"],
    },
    {
        "artist": "John Coltrane", "album": "Giant Steps", "year": 1960, "era": "Hard Bop", "label": "Atlantic",
        "key_players": ["John Coltrane - tenor saxophone", "Tommy Flanagan - piano", "Wynton Kelly - piano", "Paul Chambers - bass", "Art Taylor - drums", "Jimmy Cobb - drums"],
    },
    {
        "artist": "John Coltrane", "album": "Lush Life", "year": 1961, "era": "Hard Bop", "label": "Prestige",
        "key_players": ["John Coltrane - tenor saxophone", "Donald Byrd - trumpet", "Red Garland - piano", "Paul Chambers - bass", "Louis Hayes - drums", "Earl May - bass", "Art Taylor - drums"],
    },
    {
        "artist": "John Coltrane", "album": "Soultrane", "year": 1958, "era": "Hard Bop", "label": "Prestige",
        "key_players": ["John Coltrane - tenor saxophone", "Red Garland - piano", "Paul Chambers - bass", "Art Taylor - drums"],
    },
    {
        "artist": "McCoy Tyner", "album": "Today And Tomorrow", "year": 1964, "era": "Post-Bop", "label": "Impulse!",
        "key_players": ["McCoy Tyner - piano", "Steve Davis - bass", "Lex Humphries - drums"],
    },
    {
        "artist": "Miles Davis", "album": "Bags' Groove", "year": 1957, "era": "Hard Bop", "label": "Prestige",
        "key_players": ["Miles Davis - trumpet", "Sonny Rollins - tenor saxophone", "Thelonious Monk - piano", "Horace Silver - piano", "Percy Heath - bass", "Kenny Clarke - drums"],
    },
    {
        "artist": "Miles Davis", "album": "Birth Of The Cool", "year": 1957, "era": "Cool Jazz", "label": "Capitol",
        "key_players": ["Miles Davis - trumpet", "Lee Konitz - alto saxophone", "Gerry Mulligan - baritone saxophone", "Kai Winding - trombone", "J.J. Johnson - trombone", "Gunther Schuller - French horn", "Al Haig - piano", "Joe Shulman - bass", "Max Roach - drums"],
    },
    {
        "artist": "Miles Davis", "album": "Classic Miles Davis", "year": 1958, "era": "Cool Jazz", "label": "Columbia",
        "key_players": ["Miles Davis - trumpet", "Gil Evans - arranger, conductor"],
    },
    {
        "artist": "Miles Davis", "album": "E.S.P.", "year": 1965, "era": "Post-Bop", "label": "Columbia",
        "key_players": ["Miles Davis - trumpet", "Wayne Shorter - tenor saxophone", "Herbie Hancock - piano", "Ron Carter - bass", "Tony Williams - drums"],
    },
    {
        "artist": "Miles Davis", "album": "Godchild", "year": 1957, "era": "Cool Jazz", "label": "Capitol",
        "key_players": ["Miles Davis - trumpet", "Lee Konitz - alto saxophone", "Gerry Mulligan - baritone saxophone", "Kai Winding - trombone", "Al Haig - piano", "Joe Shulman - bass", "Max Roach - drums"],
    },
    {
        "artist": "Miles Davis", "album": "Nefertiti", "year": 1968, "era": "Post-Bop", "label": "Columbia",
        "key_players": ["Miles Davis - trumpet", "Wayne Shorter - tenor saxophone", "Herbie Hancock - piano", "Ron Carter - bass", "Tony Williams - drums"],
    },
    {
        "artist": "Miles Davis", "album": "Sorcerer", "year": 1967, "era": "Post-Bop", "label": "Columbia",
        "key_players": ["Miles Davis - trumpet", "Wayne Shorter - tenor saxophone", "Herbie Hancock - piano", "Ron Carter - bass", "Tony Williams - drums"],
    },
    {
        "artist": "Miles Davis", "album": "You're Under Arrest", "year": 1985, "era": "Contemporary", "label": "Columbia",
        "key_players": ["Miles Davis - trumpet", "John Scofield - guitar", "Bob Berg - saxophone", "Robert Irving III - synthesizer", "Darryl Jones - bass", "Al Foster - drums", "Steve Thornton - percussion"],
    },
    {
        "artist": "Nina Simone", "album": "Silk & Soul", "year": 1967, "era": "Vocal Jazz", "label": "RCA Victor",
        "key_players": ["Nina Simone - vocals, piano", "Rudy Stevenson - guitar", "Ernie Hayes - organ", "Bob Bushnell - bass", "Bernard Purdie - drums"],
    },
    {
        "artist": "Roy Hargrove", "album": "Earfood", "year": 2008, "era": "Contemporary", "label": "EmArcy",
        "primary_instrument": "trumpet",
        "subgenres": ["post-bop", "modern jazz"],
        "moods": ["warm", "sophisticated", "uplifting"],
        "key_players": ["Roy Hargrove - trumpet, flugelhorn", "Justin Robinson - alto saxophone", "Gerald Clayton - piano", "Danton Boller - bass", "Montez Coleman - drums"],
    },
    {
        "artist": "Sarah Vaughan", "album": "After Hours", "year": 1955, "era": "Vocal Jazz", "label": "RCA Victor",
        "key_players": ["Sarah Vaughan - vocals", "Jimmy Jones - piano", "Mundell Lowe - guitar", "George Duvivier - bass", "Roy Haynes - drums"],
    },
    {
        "artist": "Thelonious Monk", "album": "Brilliant Corners", "year": 1957, "era": "Hard Bop", "label": "Riverside",
        "key_players": ["Thelonious Monk - piano", "Ernie Henry - alto saxophone", "Sonny Rollins - tenor saxophone", "Oscar Pettiford - bass", "Max Roach - drums"],
    },
    {
        "artist": "Thelonious Monk", "album": "Thelonious Monk with John Coltrane", "year": 1961, "era": "Hard Bop", "label": "Jazzland",
        "key_players": ["Thelonious Monk - piano", "John Coltrane - tenor saxophone", "Gigi Gryce - alto saxophone", "Coleman Hawkins - tenor saxophone", "Ray Copeland - trumpet", "Wilbur Ware - bass", "Art Blakey - drums", "Shadow Wilson - drums"],
    },
    {
        "artist": "Wayne Shorter", "album": "Adam's Apple", "year": 1967, "era": "Post-Bop", "label": "Blue Note",
        "key_players": ["Wayne Shorter - tenor saxophone", "Herbie Hancock - piano", "Reggie Workman - bass", "Joe Chambers - drums"],
    },
    {
        "artist": "Wayne Shorter", "album": "Night Dreamer", "year": 1964, "era": "Post-Bop", "label": "Blue Note",
        "key_players": ["Wayne Shorter - tenor saxophone", "Lee Morgan - trumpet", "McCoy Tyner - piano", "Reggie Workman - bass", "Elvin Jones - drums"],
    },
]


def match(artist, album):
    a = (artist or "").lower()
    al = (album or "").lower()
    if not al:
        return None
    for item in ALBUM_META:
        if item["artist"].lower() in a and item["album"].lower() in al:
            return item
    return None


def apply(track):
    meta = match(track.get("artist"), track.get("album"))
    if not meta:
        return track
    out = dict(track)
    for key in ("year", "era", "label", "primary_instrument", "key_players", "subgenres", "moods"):
        if meta.get(key):
            out[key] = meta[key]
    out["era_source"] = "curated-album"
    out["year_source"] = "curated-album"
    out["label_source"] = "curated-album"
    out["key_players_source"] = "curated-album"
    critical = [k for k in ("era", "primary_instrument") if not out.get(k)]
    soft = [k for k in ("label", "key_players", "subgenres", "moods") if not out.get(k)]
    out["needs_enrichment"] = bool(critical)
    out["metadata_complete"] = not critical and not soft
    if critical:
        out["metadata_missing"] = critical + soft
    else:
        out.pop("metadata_missing", None)
    return out
