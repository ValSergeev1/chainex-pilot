/* =============================================================================
   ChainEx Website V05 — footer network map
   =============================================================================

   This is the only file you need to edit to change which markets (or states)
   appear on the live map in the website footer on every page.

   HOW TO ADD A MARKET
     1. Add an object to the `markets` list below with:
          id      A unique short key — letters, numbers or hyphens
                  (example: "sea"). Used in `links`.
          name    The label drawn on the map (example: "Seattle").
          state   Two-letter US state or region code (example: "WA").
                  On narrower screens the map may show this instead of the name.
          x, y    Position on the map, each from 0 to 1.
                    x:  0 is the West Coast,  1 is the East Coast
                    y:  0 is the Canadian border,  1 is South Florida
     2. Optionally add a connection in `links` as ["id-a", "id-b"].
        If you leave `links` empty, the map will lightly connect each
        market to its nearest neighbors.

   HOW TO REMOVE A MARKET
     Delete its object from `markets`, and remove any `links` that use its id.

   HOW TO SHOW STATES INSTEAD OF CITIES
     Use one entry per state — set `name` to the state name (or abbreviation)
     and pick a single x, y near the state's center. You can list as many or
     as few entries as you want; the map draws only what is in this file.

   The starting list matches the metros on the Coverage page. The footer map
   reads this file when the page loads. No other file needs to change.
   ============================================================================= */

window.CX_MARKETS = {
  /* Optional caption used by the map script. */
  label: "ChainEx regional network",

  markets: [
    { id: "sea",  name: "Seattle",      state: "WA", x: 0.10, y: 0.16 },
    { id: "pdx",  name: "Portland",     state: "OR", x: 0.09, y: 0.26 },
    { id: "boi",  name: "Boise",        state: "ID", x: 0.20, y: 0.30 },
    { id: "sac",  name: "Sacramento",   state: "CA", x: 0.08, y: 0.40 },
    { id: "lax",  name: "Los Angeles",  state: "CA", x: 0.12, y: 0.54 },
    { id: "las",  name: "Las Vegas",    state: "NV", x: 0.18, y: 0.48 },
    { id: "phx",  name: "Phoenix",      state: "AZ", x: 0.22, y: 0.58 },
    { id: "den",  name: "Denver",       state: "CO", x: 0.32, y: 0.40 },
    { id: "dal",  name: "Dallas",       state: "TX", x: 0.42, y: 0.58 },
    { id: "hou",  name: "Houston",      state: "TX", x: 0.45, y: 0.66 },
    { id: "chi",  name: "Chicago",      state: "IL", x: 0.56, y: 0.32 },
    { id: "stl",  name: "St. Louis",    state: "MO", x: 0.52, y: 0.44 },
    { id: "mem",  name: "Memphis",      state: "TN", x: 0.53, y: 0.52 },
    { id: "nsh",  name: "Nashville",    state: "TN", x: 0.58, y: 0.50 },
    { id: "det",  name: "Detroit",      state: "MI", x: 0.62, y: 0.30 },
    { id: "cle",  name: "Cleveland",    state: "OH", x: 0.64, y: 0.34 },
    { id: "phl",  name: "Philadelphia", state: "PA", x: 0.76, y: 0.34 },
    { id: "bal",  name: "Baltimore",    state: "MD", x: 0.74, y: 0.38 },
    { id: "ric",  name: "Richmond",     state: "VA", x: 0.73, y: 0.44 },
    { id: "clt",  name: "Charlotte",    state: "NC", x: 0.68, y: 0.52 },
    { id: "mco",  name: "Orlando",      state: "FL", x: 0.68, y: 0.68 },
    { id: "tpa",  name: "Tampa",        state: "FL", x: 0.65, y: 0.70 },
    { id: "mia",  name: "Miami",        state: "FL", x: 0.70, y: 0.80 }
  ],

  /* Connections drawn as arcs between markets. Remove or add freely.
     If this array is empty, nearest-neighbor links are used instead. */
  links: [
    ["sea", "pdx"], ["pdx", "sac"], ["sac", "lax"], ["pdx", "boi"],
    ["lax", "las"], ["las", "phx"], ["boi", "den"], ["las", "den"],
    ["phx", "den"], ["den", "dal"], ["dal", "hou"], ["den", "chi"],
    ["dal", "stl"], ["chi", "stl"], ["stl", "mem"], ["mem", "nsh"],
    ["chi", "det"], ["det", "cle"], ["nsh", "clt"], ["cle", "phl"],
    ["phl", "bal"], ["bal", "ric"], ["ric", "clt"], ["clt", "mco"],
    ["mco", "tpa"], ["tpa", "mia"], ["mem", "dal"]
  ]
};
