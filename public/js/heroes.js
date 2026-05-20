// ─── WC HEROES ─────────────────────────────────────────────

// Default fallback — overridden by Supabase content
let HEROES_TODAY = {
  name:'Ronaldo (R9)', firstName:'Ronaldo Nazário', display:'Ronaldo (R9) — Brazil',
  confederation:'CONMEBOL', country:'Brazil', position:'Forward',
  debutWC:1994, editions:4, goals:15, wcWinner:'Yes'
};

const HEROES_CATS = ['Confed.','Country','Position','Debut WC','Editions','Goals','WC Winner'];
const HEROES_KEYS = ['confederation','country','position','debutWC','editions','goals','wcWinner'];

const ALL_PLAYERS = [
  {name:"Pelé",firstName:"Edson Arantes",confederation:"CONMEBOL",country:"Brazil",position:"Forward",debutWC:1958,editions:4,goals:12,wcWinner:"Yes"},
  {name:"Ronaldo (R9)",firstName:"Ronaldo Nazário",confederation:"CONMEBOL",country:"Brazil",position:"Forward",debutWC:1994,editions:4,goals:15,wcWinner:"Yes"},
  {name:"Ronaldinho",firstName:"Ronaldo de Assis",confederation:"CONMEBOL",country:"Brazil",position:"Midfielder",debutWC:2002,editions:3,goals:4,wcWinner:"Yes"},
  {name:"Rivaldo",firstName:"Rivaldo Ferreira",confederation:"CONMEBOL",country:"Brazil",position:"Forward",debutWC:1998,editions:3,goals:8,wcWinner:"Yes"},
  {name:"Romário",firstName:"Romário de Faria",confederation:"CONMEBOL",country:"Brazil",position:"Forward",debutWC:1990,editions:3,goals:5,wcWinner:"Yes"},
  {name:"Cafu",firstName:"Marcos Cafu",confederation:"CONMEBOL",country:"Brazil",position:"Defender",debutWC:1990,editions:4,goals:0,wcWinner:"Yes"},
  {name:"Roberto Carlos",firstName:"Roberto Carlos",confederation:"CONMEBOL",country:"Brazil",position:"Defender",debutWC:1994,editions:4,goals:0,wcWinner:"Yes"},
  {name:"Zico",firstName:"Arthur Antunes",confederation:"CONMEBOL",country:"Brazil",position:"Midfielder",debutWC:1978,editions:3,goals:5,wcWinner:"No"},
  {name:"Bebeto",firstName:"José Roberto",confederation:"CONMEBOL",country:"Brazil",position:"Forward",debutWC:1990,editions:3,goals:8,wcWinner:"Yes"},
  {name:"Neymar",firstName:"Neymar Jr.",confederation:"CONMEBOL",country:"Brazil",position:"Forward",debutWC:2014,editions:3,goals:8,wcWinner:"No"},
  {name:"Kaka",firstName:"Ricardo Kaká",confederation:"CONMEBOL",country:"Brazil",position:"Midfielder",debutWC:2006,editions:3,goals:3,wcWinner:"No"},
  {name:"Thiago Silva",firstName:"Thiago Silva",confederation:"CONMEBOL",country:"Brazil",position:"Defender",debutWC:2010,editions:4,goals:3,wcWinner:"No"},
  {name:"Garrincha",firstName:"Manuel Francisco",confederation:"CONMEBOL",country:"Brazil",position:"Forward",debutWC:1958,editions:3,goals:5,wcWinner:"Yes"},
  {name:"Jairzinho",firstName:"Jair Ventura",confederation:"CONMEBOL",country:"Brazil",position:"Forward",debutWC:1966,editions:3,goals:9,wcWinner:"Yes"},
  {name:"Messi",firstName:"Lionel Messi",confederation:"CONMEBOL",country:"Argentina",position:"Forward",debutWC:2006,editions:5,goals:13,wcWinner:"Yes"},
  {name:"Maradona",firstName:"Diego Maradona",confederation:"CONMEBOL",country:"Argentina",position:"Midfielder",debutWC:1982,editions:4,goals:8,wcWinner:"Yes"},
  {name:"Batistuta",firstName:"Gabriel Batistuta",confederation:"CONMEBOL",country:"Argentina",position:"Forward",debutWC:1994,editions:3,goals:10,wcWinner:"No"},
  {name:"Kempes",firstName:"Mario Kempes",confederation:"CONMEBOL",country:"Argentina",position:"Forward",debutWC:1974,editions:3,goals:6,wcWinner:"Yes"},
  {name:"Di María",firstName:"Ángel Di María",confederation:"CONMEBOL",country:"Argentina",position:"Midfielder",debutWC:2010,editions:4,goals:3,wcWinner:"Yes"},
  {name:"Higuaín",firstName:"Gonzalo Higuaín",confederation:"CONMEBOL",country:"Argentina",position:"Forward",debutWC:2010,editions:3,goals:2,wcWinner:"No"},
  {name:"Kun Agüero",firstName:"Sergio Agüero",confederation:"CONMEBOL",country:"Argentina",position:"Forward",debutWC:2010,editions:3,goals:2,wcWinner:"No"},
  {name:"Caniggia",firstName:"Claudio Caniggia",confederation:"CONMEBOL",country:"Argentina",position:"Forward",debutWC:1990,editions:3,goals:4,wcWinner:"No"},
  {name:"Passarella",firstName:"Daniel Passarella",confederation:"CONMEBOL",country:"Argentina",position:"Defender",debutWC:1978,editions:2,goals:2,wcWinner:"Yes"},
  {name:"Julián Álvarez",firstName:"Julián Álvarez",confederation:"CONMEBOL",country:"Argentina",position:"Forward",debutWC:2022,editions:1,goals:4,wcWinner:"Yes"},
  {name:"Suárez",firstName:"Luis Suárez",confederation:"CONMEBOL",country:"Uruguay",position:"Forward",debutWC:2010,editions:3,goals:3,wcWinner:"No"},
  {name:"Forlán",firstName:"Diego Forlán",confederation:"CONMEBOL",country:"Uruguay",position:"Forward",debutWC:2002,editions:3,goals:4,wcWinner:"No"},
  {name:"Cavani",firstName:"Edinson Cavani",confederation:"CONMEBOL",country:"Uruguay",position:"Forward",debutWC:2010,editions:3,goals:5,wcWinner:"No"},
  {name:"James Rodríguez",firstName:"James Rodríguez",confederation:"CONMEBOL",country:"Colombia",position:"Midfielder",debutWC:2014,editions:2,goals:6,wcWinner:"No"},
  {name:"Falcao",firstName:"Radamel Falcao",confederation:"CONMEBOL",country:"Colombia",position:"Forward",debutWC:2014,editions:1,goals:0,wcWinner:"No"},
  {name:"Valderrama",firstName:"Carlos Valderrama",confederation:"CONMEBOL",country:"Colombia",position:"Midfielder",debutWC:1990,editions:3,goals:0,wcWinner:"No"},
  {name:"Ivan Zamorano",firstName:"Iván Zamorano",confederation:"CONMEBOL",country:"Chile",position:"Forward",debutWC:1998,editions:2,goals:1,wcWinner:"No"},
  {name:"Alexis Sánchez",firstName:"Alexis Sánchez",confederation:"CONMEBOL",country:"Chile",position:"Forward",debutWC:2010,editions:3,goals:3,wcWinner:"No"},
  {name:"Cubillas",firstName:"Teófilo Cubillas",confederation:"CONMEBOL",country:"Peru",position:"Midfielder",debutWC:1970,editions:2,goals:10,wcWinner:"No"},
  {name:"Klose",firstName:"Miroslav Klose",confederation:"UEFA",country:"Germany",position:"Forward",debutWC:2002,editions:4,goals:16,wcWinner:"Yes"},
  {name:"Müller (Gerd)",firstName:"Gerd Müller",confederation:"UEFA",country:"Germany",position:"Forward",debutWC:1970,editions:2,goals:14,wcWinner:"Yes"},
  {name:"Thomas Müller",firstName:"Thomas Müller",confederation:"UEFA",country:"Germany",position:"Forward",debutWC:2010,editions:3,goals:10,wcWinner:"Yes"},
  {name:"Beckenbauer",firstName:"Franz Beckenbauer",confederation:"UEFA",country:"Germany",position:"Defender",debutWC:1966,editions:4,goals:5,wcWinner:"Yes"},
  {name:"Matthäus",firstName:"Lothar Matthäus",confederation:"UEFA",country:"Germany",position:"Midfielder",debutWC:1982,editions:5,goals:6,wcWinner:"Yes"},
  {name:"Klinsmann",firstName:"Jürgen Klinsmann",confederation:"UEFA",country:"Germany",position:"Forward",debutWC:1990,editions:4,goals:11,wcWinner:"Yes"},
  {name:"Rummenigge",firstName:"Karl-Heinz Rummenigge",confederation:"UEFA",country:"Germany",position:"Forward",debutWC:1978,editions:3,goals:9,wcWinner:"Yes"},
  {name:"Lahm",firstName:"Philipp Lahm",confederation:"UEFA",country:"Germany",position:"Defender",debutWC:2006,editions:3,goals:1,wcWinner:"Yes"},
  {name:"Neuer",firstName:"Manuel Neuer",confederation:"UEFA",country:"Germany",position:"Goalkeeper",debutWC:2010,editions:3,goals:0,wcWinner:"Yes"},
  {name:"Kroos",firstName:"Toni Kroos",confederation:"UEFA",country:"Germany",position:"Midfielder",debutWC:2010,editions:3,goals:4,wcWinner:"Yes"},
  {name:"Özil",firstName:"Mesut Özil",confederation:"UEFA",country:"Germany",position:"Midfielder",debutWC:2010,editions:3,goals:3,wcWinner:"Yes"},
  {name:"Ballack",firstName:"Michael Ballack",confederation:"UEFA",country:"Germany",position:"Midfielder",debutWC:2002,editions:3,goals:5,wcWinner:"No"},
  {name:"Zidane",firstName:"Zinedine Zidane",confederation:"UEFA",country:"France",position:"Midfielder",debutWC:1998,editions:3,goals:5,wcWinner:"Yes"},
  {name:"Mbappé",firstName:"Kylian Mbappé",confederation:"UEFA",country:"France",position:"Forward",debutWC:2018,editions:2,goals:12,wcWinner:"Yes"},
  {name:"Henry",firstName:"Thierry Henry",confederation:"UEFA",country:"France",position:"Forward",debutWC:1998,editions:3,goals:3,wcWinner:"Yes"},
  {name:"Platini",firstName:"Michel Platini",confederation:"UEFA",country:"France",position:"Midfielder",debutWC:1978,editions:3,goals:5,wcWinner:"No"},
  {name:"Griezmann",firstName:"Antoine Griezmann",confederation:"UEFA",country:"France",position:"Forward",debutWC:2014,editions:3,goals:7,wcWinner:"Yes"},
  {name:"Thuram",firstName:"Lilian Thuram",confederation:"UEFA",country:"France",position:"Defender",debutWC:1998,editions:3,goals:2,wcWinner:"Yes"},
  {name:"Trezeguet",firstName:"David Trezeguet",confederation:"UEFA",country:"France",position:"Forward",debutWC:1998,editions:2,goals:4,wcWinner:"Yes"},
  {name:"Giroud",firstName:"Olivier Giroud",confederation:"UEFA",country:"France",position:"Forward",debutWC:2014,editions:3,goals:4,wcWinner:"Yes"},
  {name:"Buffon",firstName:"Gianluigi Buffon",confederation:"UEFA",country:"Italy",position:"Goalkeeper",debutWC:1998,editions:5,goals:0,wcWinner:"Yes"},
  {name:"Baggio",firstName:"Roberto Baggio",confederation:"UEFA",country:"Italy",position:"Forward",debutWC:1990,editions:4,goals:9,wcWinner:"No"},
  {name:"Maldini",firstName:"Paolo Maldini",confederation:"UEFA",country:"Italy",position:"Defender",debutWC:1990,editions:4,goals:0,wcWinner:"No"},
  {name:"Baresi",firstName:"Franco Baresi",confederation:"UEFA",country:"Italy",position:"Defender",debutWC:1982,editions:3,goals:0,wcWinner:"Yes"},
  {name:"Totti",firstName:"Francesco Totti",confederation:"UEFA",country:"Italy",position:"Midfielder",debutWC:1998,editions:3,goals:1,wcWinner:"Yes"},
  {name:"Del Piero",firstName:"Alessandro Del Piero",confederation:"UEFA",country:"Italy",position:"Forward",debutWC:1998,editions:4,goals:3,wcWinner:"Yes"},
  {name:"Schillaci",firstName:"Salvatore Schillaci",confederation:"UEFA",country:"Italy",position:"Forward",debutWC:1990,editions:1,goals:6,wcWinner:"No"},
  {name:"Rossi (Paolo)",firstName:"Paolo Rossi",confederation:"UEFA",country:"Italy",position:"Forward",debutWC:1978,editions:3,goals:9,wcWinner:"Yes"},
  {name:"Pirlo",firstName:"Andrea Pirlo",confederation:"UEFA",country:"Italy",position:"Midfielder",debutWC:2002,editions:4,goals:0,wcWinner:"Yes"},
  {name:"Cannavaro",firstName:"Fabio Cannavaro",confederation:"UEFA",country:"Italy",position:"Defender",debutWC:1998,editions:4,goals:0,wcWinner:"Yes"},
  {name:"Xavi",firstName:"Xavier Hernández",confederation:"UEFA",country:"Spain",position:"Midfielder",debutWC:2002,editions:4,goals:0,wcWinner:"Yes"},
  {name:"Iniesta",firstName:"Andrés Iniesta",confederation:"UEFA",country:"Spain",position:"Midfielder",debutWC:2006,editions:3,goals:2,wcWinner:"Yes"},
  {name:"Villa",firstName:"David Villa",confederation:"UEFA",country:"Spain",position:"Forward",debutWC:2006,editions:3,goals:4,wcWinner:"Yes"},
  {name:"Raúl",firstName:"Raúl González",confederation:"UEFA",country:"Spain",position:"Forward",debutWC:1998,editions:3,goals:3,wcWinner:"No"},
  {name:"Fernando Torres",firstName:"Fernando Torres",confederation:"UEFA",country:"Spain",position:"Forward",debutWC:2006,editions:3,goals:3,wcWinner:"Yes"},
  {name:"Casillas",firstName:"Iker Casillas",confederation:"UEFA",country:"Spain",position:"Goalkeeper",debutWC:2002,editions:4,goals:0,wcWinner:"Yes"},
  {name:"Puyol",firstName:"Carles Puyol",confederation:"UEFA",country:"Spain",position:"Defender",debutWC:2002,editions:4,goals:1,wcWinner:"Yes"},
  {name:"Busquets",firstName:"Sergio Busquets",confederation:"UEFA",country:"Spain",position:"Midfielder",debutWC:2010,editions:3,goals:0,wcWinner:"Yes"},
  {name:"Ronaldo (CR7)",firstName:"Cristiano Ronaldo",confederation:"UEFA",country:"Portugal",position:"Forward",debutWC:2006,editions:5,goals:8,wcWinner:"No"},
  {name:"Eusébio",firstName:"Eusébio da Silva",confederation:"UEFA",country:"Portugal",position:"Forward",debutWC:1966,editions:1,goals:9,wcWinner:"No"},
  {name:"Figo",firstName:"Luís Figo",confederation:"UEFA",country:"Portugal",position:"Midfielder",debutWC:1994,editions:4,goals:1,wcWinner:"No"},
  {name:"Pepe",firstName:"Pepe",confederation:"UEFA",country:"Portugal",position:"Defender",debutWC:2010,editions:4,goals:0,wcWinner:"No"},
  {name:"Lineker",firstName:"Gary Lineker",confederation:"UEFA",country:"England",position:"Forward",debutWC:1986,editions:3,goals:10,wcWinner:"No"},
  {name:"Rooney",firstName:"Wayne Rooney",confederation:"UEFA",country:"England",position:"Forward",debutWC:2004,editions:3,goals:1,wcWinner:"No"},
  {name:"Beckham",firstName:"David Beckham",confederation:"UEFA",country:"England",position:"Midfielder",debutWC:1998,editions:3,goals:0,wcWinner:"No"},
  {name:"Kane",firstName:"Harry Kane",confederation:"UEFA",country:"England",position:"Forward",debutWC:2018,editions:2,goals:6,wcWinner:"No"},
  {name:"Bobby Charlton",firstName:"Bobby Charlton",confederation:"UEFA",country:"England",position:"Midfielder",debutWC:1958,editions:4,goals:4,wcWinner:"Yes"},
  {name:"Bobby Moore",firstName:"Bobby Moore",confederation:"UEFA",country:"England",position:"Defender",debutWC:1962,editions:3,goals:0,wcWinner:"Yes"},
  {name:"Geoff Hurst",firstName:"Geoff Hurst",confederation:"UEFA",country:"England",position:"Forward",debutWC:1966,editions:1,goals:4,wcWinner:"Yes"},
  {name:"Cruyff",firstName:"Johan Cruyff",confederation:"UEFA",country:"Netherlands",position:"Forward",debutWC:1974,editions:1,goals:3,wcWinner:"No"},
  {name:"Van Basten",firstName:"Marco Van Basten",confederation:"UEFA",country:"Netherlands",position:"Forward",debutWC:1990,editions:2,goals:4,wcWinner:"No"},
  {name:"Robben",firstName:"Arjen Robben",confederation:"UEFA",country:"Netherlands",position:"Forward",debutWC:2006,editions:3,goals:6,wcWinner:"No"},
  {name:"Van Persie",firstName:"Robin Van Persie",confederation:"UEFA",country:"Netherlands",position:"Forward",debutWC:2006,editions:3,goals:6,wcWinner:"No"},
  {name:"Gullit",firstName:"Ruud Gullit",confederation:"UEFA",country:"Netherlands",position:"Forward",debutWC:1990,editions:2,goals:3,wcWinner:"No"},
  {name:"Bergkamp",firstName:"Dennis Bergkamp",confederation:"UEFA",country:"Netherlands",position:"Forward",debutWC:1994,editions:3,goals:6,wcWinner:"No"},
  {name:"Sneijder",firstName:"Wesley Sneijder",confederation:"UEFA",country:"Netherlands",position:"Midfielder",debutWC:2006,editions:3,goals:6,wcWinner:"No"},
  {name:"Modric",firstName:"Luka Modric",confederation:"UEFA",country:"Croatia",position:"Midfielder",debutWC:2006,editions:4,goals:3,wcWinner:"No"},
  {name:"Suker",firstName:"Davor Šuker",confederation:"UEFA",country:"Croatia",position:"Forward",debutWC:1998,editions:2,goals:6,wcWinner:"No"},
  {name:"Lewandowski",firstName:"Robert Lewandowski",confederation:"UEFA",country:"Poland",position:"Forward",debutWC:2018,editions:2,goals:2,wcWinner:"No"},
  {name:"Lato",firstName:"Grzegorz Lato",confederation:"UEFA",country:"Poland",position:"Forward",debutWC:1974,editions:3,goals:10,wcWinner:"No"},
  {name:"De Bruyne",firstName:"Kevin De Bruyne",confederation:"UEFA",country:"Belgium",position:"Midfielder",debutWC:2014,editions:3,goals:2,wcWinner:"No"},
  {name:"Lukaku",firstName:"Romelu Lukaku",confederation:"UEFA",country:"Belgium",position:"Forward",debutWC:2014,editions:3,goals:4,wcWinner:"No"},
  {name:"Hazard",firstName:"Eden Hazard",confederation:"UEFA",country:"Belgium",position:"Midfielder",debutWC:2014,editions:3,goals:3,wcWinner:"No"},
  {name:"Ibrahimović",firstName:"Zlatan Ibrahimović",confederation:"UEFA",country:"Sweden",position:"Forward",debutWC:2002,editions:2,goals:1,wcWinner:"No"},
  {name:"Larsson",firstName:"Henrik Larsson",confederation:"UEFA",country:"Sweden",position:"Forward",debutWC:1994,editions:3,goals:5,wcWinner:"No"},
  {name:"Eriksen",firstName:"Christian Eriksen",confederation:"UEFA",country:"Denmark",position:"Midfielder",debutWC:2010,editions:3,goals:3,wcWinner:"No"},
  {name:"Laudrup",firstName:"Michael Laudrup",confederation:"UEFA",country:"Denmark",position:"Midfielder",debutWC:1986,editions:3,goals:3,wcWinner:"No"},
  {name:"Stoichkov",firstName:"Hristo Stoichkov",confederation:"UEFA",country:"Bulgaria",position:"Forward",debutWC:1994,editions:3,goals:6,wcWinner:"No"},
  {name:"Shevchenko",firstName:"Andriy Shevchenko",confederation:"UEFA",country:"Ukraine",position:"Forward",debutWC:2006,editions:1,goals:3,wcWinner:"No"},
  {name:"Drogba",firstName:"Didier Drogba",confederation:"CAF",country:"Côte d'Ivoire",position:"Forward",debutWC:2006,editions:3,goals:2,wcWinner:"No"},
  {name:"Eto'o",firstName:"Samuel Eto'o",confederation:"CAF",country:"Cameroon",position:"Forward",debutWC:1998,editions:4,goals:4,wcWinner:"No"},
  {name:"Salah",firstName:"Mohamed Salah",confederation:"CAF",country:"Egypt",position:"Forward",debutWC:2018,editions:1,goals:2,wcWinner:"No"},
  {name:"Mané",firstName:"Sadio Mané",confederation:"CAF",country:"Senegal",position:"Forward",debutWC:2018,editions:2,goals:1,wcWinner:"No"},
  {name:"Yekini",firstName:"Rashidi Yekini",confederation:"CAF",country:"Nigeria",position:"Forward",debutWC:1994,editions:2,goals:5,wcWinner:"No"},
  {name:"Okocha",firstName:"Jay-Jay Okocha",confederation:"CAF",country:"Nigeria",position:"Midfielder",debutWC:1994,editions:2,goals:1,wcWinner:"No"},
  {name:"Gyan",firstName:"Asamoah Gyan",confederation:"CAF",country:"Ghana",position:"Forward",debutWC:2006,editions:3,goals:6,wcWinner:"No"},
  {name:"Essien",firstName:"Michael Essien",confederation:"CAF",country:"Ghana",position:"Midfielder",debutWC:2006,editions:2,goals:0,wcWinner:"No"},
  {name:"El Hadji Diouf",firstName:"El Hadji Diouf",confederation:"CAF",country:"Senegal",position:"Forward",debutWC:2002,editions:2,goals:0,wcWinner:"No"},
  {name:"Son Heung-min",firstName:"Son Heung-min",confederation:"AFC",country:"South Korea",position:"Forward",debutWC:2014,editions:3,goals:2,wcWinner:"No"},
  {name:"Park Ji-Sung",firstName:"Park Ji-Sung",confederation:"AFC",country:"South Korea",position:"Midfielder",debutWC:2002,editions:3,goals:2,wcWinner:"No"},
  {name:"Nakata",firstName:"Hidetoshi Nakata",confederation:"AFC",country:"Japan",position:"Midfielder",debutWC:1998,editions:2,goals:2,wcWinner:"No"},
  {name:"Honda",firstName:"Keisuke Honda",confederation:"AFC",country:"Japan",position:"Midfielder",debutWC:2010,editions:3,goals:4,wcWinner:"No"},
  {name:"Ali Daei",firstName:"Ali Daei",confederation:"AFC",country:"Iran",position:"Forward",debutWC:1978,editions:3,goals:3,wcWinner:"No"},
  {name:"Hernández (Chicharito)",firstName:"Javier Hernández",confederation:"CONCACAF",country:"Mexico",position:"Forward",debutWC:2010,editions:3,goals:4,wcWinner:"No"},
  {name:"Blanco",firstName:"Cuauhtémoc Blanco",confederation:"CONCACAF",country:"Mexico",position:"Midfielder",debutWC:1998,editions:4,goals:4,wcWinner:"No"},
  {name:"Marquez",firstName:"Rafael Márquez",confederation:"CONCACAF",country:"Mexico",position:"Defender",debutWC:2002,editions:5,goals:2,wcWinner:"No"},
  {name:"Donovan",firstName:"Landon Donovan",confederation:"CONCACAF",country:"USA",position:"Midfielder",debutWC:2002,editions:3,goals:5,wcWinner:"No"},
  {name:"Pulisic",firstName:"Christian Pulisic",confederation:"CONCACAF",country:"USA",position:"Midfielder",debutWC:2022,editions:1,goals:1,wcWinner:"No"},
];

let heroGuesses=0, heroSelected=null, heroDone=false, heroRevealing=false;
const heroGuessed = new Set();
let heroFiltered=[], heroHlIdx=-1;

async function initHeroes() {
  const state = getState();

  // Load today's WC Hero from Supabase
  try {
    const { data } = await sb.from('daily_content').select('wc_hero').eq('date', CONFIG.today).maybeSingle();
    if (data?.wc_hero) {
      HEROES_TODAY = data.wc_hero;
      // Build display string if not set
      if (!HEROES_TODAY.display) {
        HEROES_TODAY.display = `${HEROES_TODAY.firstName || HEROES_TODAY.name} — ${HEROES_TODAY.country}`;
      }
    }
  } catch { /* use fallback */ }

  // Build header row
  const header = document.getElementById('guess-header');
  header.innerHTML = `<th class="col-header player-col">Player</th>` +
    HEROES_CATS.map(c => `<th class="col-header">${c}</th>`).join('');

  // Check if already solved today
  if (state.heroes_done) {
    heroDone = true;
    heroGuesses = state.heroes_guesses || 0;
    const fb = document.getElementById('heroes-fb');
    fb.className = 'fb ok';
    const pts = SCORING.heroes.formula(heroGuesses);
    fb.innerHTML = `🏆 Already solved! Today's WC Hero is <strong>${state.heroes_player||''}</strong>. Score: <strong>${pts} pts</strong>`;
    fb.style.display = 'block';
    document.getElementById('legend-inp').disabled = true;
    document.getElementById('heroes-submit').disabled = true;
    document.getElementById('guess-count').textContent = `Solved in ${heroGuesses} guess${heroGuesses===1?'':'es'}`;
  }

  // Set up search
  const inp = document.getElementById('legend-inp');
  const btn = document.getElementById('heroes-submit');
  inp.addEventListener('input', heroFilter);
  btn.addEventListener('click', submitHeroGuess);
  inp.addEventListener('keydown', e => {
    const dd = document.getElementById('legend-dd');
    if (e.key==='ArrowDown') { e.preventDefault(); heroHlIdx=Math.min(heroHlIdx+1,heroFiltered.length-1); heroUpdateHL(); }
    else if (e.key==='ArrowUp') { e.preventDefault(); heroHlIdx=Math.max(heroHlIdx-1,0); heroUpdateHL(); }
    else if (e.key==='Enter') {
      e.preventDefault();
      if (dd.style.display==='block' && heroHlIdx>=0 && heroFiltered[heroHlIdx]) heroPickPlayer(heroFiltered[heroHlIdx]);
      else if (dd.style.display==='block' && heroFiltered.length===1) heroPickPlayer(heroFiltered[0]);
      else if (heroSelected && !btn.disabled && !heroRevealing) submitHeroGuess();
    }
    else if (e.key==='Escape') { dd.style.display='none'; heroHlIdx=-1; }
  });
}

function heroUpdateHL() {
  document.getElementById('legend-dd').querySelectorAll('.legend-opt').forEach((o,i) => o.classList.toggle('hl', i===heroHlIdx));
}

function heroFilter() {
  heroHlIdx=-1; heroSelected=null;
  document.getElementById('heroes-submit').disabled=true;
  const val = document.getElementById('legend-inp').value.toLowerCase().trim();
  const dd = document.getElementById('legend-dd');
  dd.innerHTML='';
  if (!val) { dd.style.display='none'; return; }
  heroFiltered = ALL_PLAYERS.filter(p =>
    !heroGuessed.has(p.name) &&
    (p.name.toLowerCase().includes(val) || p.firstName.toLowerCase().includes(val) || p.country.toLowerCase().includes(val))
  ).slice(0, 8);
  if (!heroFiltered.length) { dd.style.display='none'; return; }
  dd.style.display='block';
  heroFiltered.forEach(p => {
    const div = document.createElement('div');
    div.className = 'legend-opt';
    const same = p.firstName.toLowerCase() === p.name.toLowerCase();
    div.innerHTML = `<div style="font-weight:500">${p.firstName}${same?'':` <span style="color:var(--text-3);font-weight:400">(${p.name})</span>`}</div><div class="legend-opt-sub">${p.country} · ${p.position}</div>`;
    div.addEventListener('mousedown', e => { e.preventDefault(); heroPickPlayer(p); });
    dd.appendChild(div);
  });
}

function heroPickPlayer(p) {
  heroSelected = p;
  const same = p.firstName.toLowerCase() === p.name.toLowerCase();
  document.getElementById('legend-inp').value = p.firstName + (same ? '' : ` (${p.name})`);
  document.getElementById('legend-dd').style.display = 'none';
  heroHlIdx = -1;
  document.getElementById('heroes-submit').disabled = false;
}

function heroGetClass(key, gv, tv) {
  if (gv===tv) return 'ok';
  if (typeof gv==='number' && typeof tv==='number' && Math.abs(gv-tv)<=2) return 'close';
  return 'no';
}
function heroGetArrow(key, gv, tv) {
  if (typeof gv!=='number' || typeof tv!=='number' || gv===tv) return '';
  return gv < tv ? ' ▲' : ' ▼';
}

function heroRevealCells(cells, classes, values, onDone) {
  let i=0;
  function next() {
    if (i>=cells.length) { if(onDone) onDone(); return; }
    const cell=cells[i], cls=classes[i], val=values[i];
    cell.classList.add('flipping');
    setTimeout(() => {
      cell.classList.add(cls);
      cell.querySelector('.cat-val').textContent = val;
      cell.classList.remove('flipping');
      i++;
      setTimeout(next, 220);
    }, 250);
  }
  next();
}

function submitHeroGuess() {
  if (!heroSelected || heroDone || heroRevealing) return;
  heroRevealing = true;
  heroGuesses++;
  heroGuessed.add(heroSelected.name);
  const guess = heroSelected;

  const tbody = document.getElementById('guess-body');
  const tr = document.createElement('tr');
  const nameTd = document.createElement('td');
  const same = guess.firstName.toLowerCase() === guess.name.toLowerCase();
  nameTd.innerHTML = `<div class="player-cell">${guess.firstName}<div class="player-cell-sub">${same?'':guess.name+' · '}${guess.country}</div></div>`;
  tr.appendChild(nameTd);

  const catTds = [];
  HEROES_KEYS.forEach((key, i) => {
    const td = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'cat-cell';
    div.innerHTML = `<div class="cat-name">${HEROES_CATS[i]}</div><div class="cat-val">—</div>`;
    td.appendChild(div); tr.appendChild(td); catTds.push(div);
  });
  tbody.insertBefore(tr, tbody.firstChild);

  document.getElementById('heroes-submit').disabled = true;
  document.getElementById('legend-inp').disabled = true;
  document.getElementById('legend-inp').value = '';
  heroSelected = null;

  const classes = HEROES_KEYS.map(k => heroGetClass(k, guess[k], HEROES_TODAY[k]));
  const values = HEROES_KEYS.map((k,i) => guess[k] + (classes[i]==='close' ? heroGetArrow(k, guess[k], HEROES_TODAY[k]) : ''));

  heroRevealCells(catTds, classes, values, () => {
    heroRevealing = false;
    document.getElementById('guess-count').textContent = `Guesses: ${heroGuesses}`;

    const win = guess.name === HEROES_TODAY.name ||
      (guess.country === HEROES_TODAY.country && guess.debutWC === HEROES_TODAY.debutWC && guess.goals === HEROES_TODAY.goals);

    if (win) {
      heroDone = true;
      const pts = SCORING.heroes.formula(heroGuesses);
      saveState({ heroes_done:true, heroes_guesses:heroGuesses, heroes_player:HEROES_TODAY.display, score_heroes:pts });
      saveScoreToDb('heroes', pts);
      document.getElementById('sc-heroes').textContent = pts + 'pts';
      updateScoreDisplay();
      const fb = document.getElementById('heroes-fb');
      fb.className = 'fb ok';
      fb.innerHTML = `🏆 Correct! Today's WC Hero is <strong>${HEROES_TODAY.display}</strong>.<br>Solved in <strong>${heroGuesses}</strong> guess${heroGuesses===1?'':'es'} → <strong>${pts} pts</strong>`;
      fb.style.display = 'block';
      document.getElementById('legend-inp').disabled = true;
      document.getElementById('guess-count').textContent = `Solved in ${heroGuesses} guess${heroGuesses===1?'':'es'} · ${pts} pts`;
    } else {
      document.getElementById('legend-inp').disabled = false;
      document.getElementById('legend-inp').value = '';
    }
  });
}
