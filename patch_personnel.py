"""
Patch key_players for tracks with incomplete personnel.
Only touches tracks where session/album is known with high confidence.
"""
import json
from pathlib import Path

PATH = Path(__file__).parent / "training-data.json"
data = json.loads(PATH.read_text())

# Each entry: (title, artist) -> list of players to append (only adds, never overwrites)
PATCHES = {
    # Coltrane quartet, Atlantic 1960
    ("My Favorite Things", "John Coltrane"): [
        "Jimmy Garrison - bass",
        "Elvin Jones - drums",
    ],
    # Mingus Ah Um, Columbia 1959
    ("Goodbye Pork Pie Hat", "Charles Mingus"): [
        "Horace Parlan - piano",
        "Dannie Richmond - drums",
    ],
    # Speak No Evil, Blue Note 1964
    ("Speak No Evil", "Wayne Shorter"): [
        "Freddie Hubbard - trumpet",
        "Ron Carter - bass",
        "Elvin Jones - drums",
    ],
    # Go!, Blue Note 1962
    ("You've Changed", "Dexter Gordon"): [
        "Sonny Clark - piano",
        "Butch Warren - bass",
        "Billy Higgins - drums",
    ],
    # Eastern Sounds, Moodsville 1961 (both tracks on same session)
    ("Love Theme from Spartacus", "Yusef Lateef"): [
        "Barry Harris - piano",
        "Ernie Farrow - bass",
        "Lex Humphries - drums",
    ],
    ("Love Theme From The Robe", "Yusef Lateef"): [
        "Barry Harris - piano",
        "Ernie Farrow - bass",
        "Lex Humphries - drums",
    ],
    # Backlash, Atlantic 1966
    ("Little Sunflower", "Freddie Hubbard"): [
        "James Spaulding - alto saxophone",
        "Harold Mabern - piano",
        "Bob Cunningham - bass",
        "Pete La Roca - drums",
    ],
    # Chet Baker Sings, Pacific Jazz 1954
    ("My Funny Valentine", "Chet Baker"): [
        "Russ Freeman - piano",
        "Carson Smith - bass",
        "Bob Neel - drums",
    ],
    # West Coast Jazz, Norgran 1955
    ("Autumn Leaves", "Stan Getz"): [
        "Conte Candoli - trumpet",
        "Lou Levy - piano",
        "Leroy Vinnegar - bass",
        "Shelly Manne - drums",
    ],
    # Scenery, Enja 1976
    ("Early Summer", "Ryo Fukui"): [
        "Satoshi Denpo - bass",
        "Yoshinori Fukui - drums",
    ],
    # From Left to Right, MGM 1970
    ("What Are You Doing the Rest of Your Life", "Bill Evans"): [
        "Eddie Gomez - bass",
        "Marty Morell - drums",
    ],
}

changed = 0
for entry in data:
    key = (entry.get("title"), entry.get("artist"))
    if key not in PATCHES:
        continue
    existing = set(entry.get("key_players") or [])
    to_add = [p for p in PATCHES[key] if p not in existing]
    if not to_add:
        continue
    entry["key_players"] = list(existing) + to_add
    print(f"  {key[0]} ({key[1]}): added {to_add}")
    changed += 1

PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nPatched {changed} tracks.")
