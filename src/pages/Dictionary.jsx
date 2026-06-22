import Navigation from '../components/shared/Navigation';
import '../styles/dictionary.css';

const POSITIVE_SIGNALS = [
  {
    name: 'Sexy / Sensual',
    signal: 'Strongest positive',
    signalClass: 'signal-positive',
    def: 'A track that feels intimate, seductive, and emotionally charged in a physical way. Not just pretty — it has heat. The quality of making you lean in, not sit back. Often paired with tender sax playing, slow tempos, and dark harmonic color.',
    examples: 'God Bless the Child (10) — "super sexy, the sax playing is tender." Equinox (8.5) — "very bluesy, moody, sexy." Tryin\' Times (9) — "sexy as hell." Goodbye Pork Pie Hat (10) — "sexy and mournfully romantic." Moanin\'/Blakey (7.5) — "really sexy and cool."',
    quote: '"Sensual" mood tags average 9.4/10 — the highest of any mood in the dataset.',
  },
  {
    name: 'Fuck-You Attitude',
    signal: 'Strong positive',
    signalClass: 'signal-positive',
    def: 'An unhurried, self-assured coolness. The track sounds like the musician doesn\'t care whether you\'re listening — they\'re playing for themselves. Not aggressive or confrontational, but effortlessly confident. The opposite of trying to impress.',
    examples: 'So What (10) — the archetypal cool. St. Thomas (8) — "cool in a similar way to So What — expression, fuck-you attitude." Equinox (8.5) — "fuck-you unhurried attitude." Moanin\'/Blakey (7.5) — "has that fuck-you attitude."',
    quote: 'Tracks with this quality never rate below 7.5. It\'s the most reliable positive signal in the dataset.',
  },
  {
    name: 'Romantic / Tender',
    signal: 'Core preference',
    signalClass: 'signal-positive',
    def: 'Emotionally open and vulnerable music that conveys love, longing, or deep affection. Not saccharine — it has weight. Often involves muted trumpet, lyrical sax, or intimate piano. The feeling of something precious and fragile.',
    examples: 'Love Theme from Spartacus (10) — "so romantic." It Never Entered My Mind (9) — "pretty, romantic." Naima (8) — "beautiful." Wild Is The Wind (8) — "so pretty."',
    quote: '"Romantic" appears in 15 tracks — the second most common mood. But it\'s necessary, not sufficient. A romantic track can still miss if it drags or lacks melodic identity.',
  },
  {
    name: 'Communal / Celebratory',
    signal: '10/10 territory',
    signalClass: 'signal-positive',
    def: 'High-energy music that feels like a group celebration rather than a performance. Gospel-tinged, joyful, and inclusive. The energy is shared between players, not directed at an audience. It\'s a party you\'re inside, not watching.',
    examples: 'Better Git It in Your Soul (10) — "like Moanin\' but somehow more dynamic." Moanin\'/Mingus Big Band (9) — "high passion, high energy but in a fun way."',
    quote: 'Both communal/celebratory tracks are rated 9+. This is one of only two paths to a perfect 10 (the other is sexy/tragic ballads).',
  },
  {
    name: 'Bittersweet',
    signal: 'Strong positive',
    signalClass: 'signal-positive',
    def: 'Sad but not defeated. Music that holds sorrow and hope simultaneously — the Dorian quality. Not tragic (that\'s too heavy without light). Not melancholic (that can be passive). Bittersweet is active sadness with beauty in it.',
    examples: 'Peace Piece (9) — "bittersweet feeling." Infant Eyes (7.5) — "tender and mysterious." The "sad but hopeful" quality that defines the Dorian mode sweet spot.',
    quote: 'Dorian mode tracks average 10.0. The bittersweet quality of Dorian — minor color with a raised 6th that adds warmth — is the sound of Justin\'s emotional center.',
  },
  {
    name: 'Structural Variety',
    signal: 'Engagement signal',
    signalClass: 'signal-positive',
    def: 'When a track has distinct sections, shifts, or surprises that prevent monotony. Not just head-solos-head, but real compositional architecture. Mode switches, tempo changes, unexpected entries. Keeps the ear interested and prevents sleepiness.',
    examples: 'Blue Train (8) — "creatively had 3 different sections — loved the structural variety." Open Letter to Duke (8) — "nice surprise with a beautiful back half." Flamenco Sketches (6) — "the switches really stopped it from getting sleepy."',
    quote: null,
  },
  {
    name: 'Never Gets Tired of It',
    signal: 'Maximum replayability',
    signalClass: 'signal-positive',
    def: 'The highest compliment. A track with infinite replay value — it works every time, in every mood, and reveals something new on each listen. The track equivalent of a comfort meal that\'s also a masterpiece.',
    examples: 'My Favorite Things (10) — "never gets tired of it." Love Theme from Spartacus (10) — "never gets tired of it." Tezeta (9) — "every time it ends, wants to listen again."',
    quote: null,
  },
  {
    name: 'Wants It on Vinyl',
    signal: 'Highest album honor',
    signalClass: 'signal-positive',
    def: 'When an album earns the desire to own physically. Signals deep emotional attachment, high replayability, and the belief that this is something worth holding onto permanently. Reserved for albums, not individual tracks.',
    examples: 'Mingus Ah Um (8) — "wants it on vinyl." This is the album-level equivalent of "never gets tired of it."',
    quote: null,
  },
];

const NEGATIVE_SIGNALS = [
  {
    name: 'Flat / Forgettable',
    signal: 'Strongest negative',
    signalClass: 'signal-negative',
    def: 'The worst thing a track can be. Not bad — invisible. It plays and nothing happens inside. No emotional response, no moment worth remembering. The musical equivalent of a conversation you can\'t recall having. Often the result of missing melodic identity or emotional specificity.',
    examples: 'John S. (3) — "not great, a little flat." Circle (3) — "forgettable." Blue 7 (4) — "in context of the album, didn\'t land." Embraceable You (5) — "forgot why he liked it."',
    quote: '"Flat" is the opposite of everything Justin values. It\'s not that the music is technically bad — it\'s that it has no identity.',
  },
  {
    name: 'Corny',
    signal: 'Floor-level negative',
    signalClass: 'signal-negative',
    def: 'Performed emotion instead of felt emotion. When a track or performance signals "this is touching" rather than actually being touching. The gap between the intent and the delivery is audible. Saccharine, forced sincerity, or cliched emotional beats.',
    examples: 'That Old Feeling (2) — "felt corny. New lowest rating in the dataset." April In Paris (6) — "good but a little too cliche."',
    quote: '"Corny" produced the lowest rating in the entire dataset. It\'s the anti-authenticity signal — the exact opposite of what makes jazz work for Justin.',
  },
  {
    name: 'Showtimey',
    signal: 'Performance penalty',
    signalClass: 'signal-negative',
    def: 'Virtuosity for display rather than expression. When a musician is showing you how good they are instead of playing the music. Technical fireworks that feel directed at an audience rather than emerging from the composition. The feeling of being performed at.',
    examples: 'Moment\'s Notice (6) — "felt a little showtimey." The opposite of "fuck-you attitude" — showtimey musicians care too much about the audience.',
    quote: 'Showtimey tracks get rated but don\'t get replayed. The rating says "I see the talent." The replayability says "I don\'t need to hear it again."',
  },
  {
    name: 'Drags On / Sleepy',
    signal: 'Pacing failure',
    signalClass: 'signal-negative',
    def: 'When a track loses momentum and can\'t sustain its emotional idea across its runtime. Not the same as "slow" — slow tracks can be riveting. Dragging is when the slowness becomes empty, when space stops being intentional and starts feeling like nothing\'s happening. "Sleepy" is the more extreme version — when a track actively lulls you out of engagement.',
    examples: 'Blue in Green (8) — "kinda drags on." Where Are You? (5) — "on reflection, a bit too slow, revised to 5." Laura (5) — "almost lulls me to sleep." Flamenco Sketches (6) — mode switches "stopped it from getting sleepy."',
    quote: 'Justin is highly pacing-sensitive. Tracks under 7 minutes are safer. Structural variety is the antidote to sleepiness.',
  },
  {
    name: 'Solo Show',
    signal: 'Ensemble failure',
    signalClass: 'signal-negative',
    def: 'When a track feels like one musician performing and everyone else backing them up. The ensemble disappears and it becomes a showcase for a single player. The opposite of communal — instead of music being made together, it\'s one person on a stage.',
    examples: 'Parker\'s Mood (3) — "seems like a solo show." This is a recurring issue with bebop-era tracks where the lead player dominates.',
    quote: null,
  },
  {
    name: 'Too Tragic',
    signal: 'Emotional overload',
    signalClass: 'signal-negative',
    def: 'When sadness has no counterweight. Tragedy without hope, sorrow without beauty, darkness without a crack of light. Justin wants depth — he doesn\'t want despair. The distinction between "bittersweet" (positive) and "tragic" (negative) is whether there\'s something to hold onto.',
    examples: 'Alabama (6) — "a little too tragic — no sense of optimism." He respects the piece but needs certain emotional conditions to appreciate it.',
    quote: null,
  },
  {
    name: 'Not Jazzy Enough',
    signal: 'Genre boundary',
    signalClass: 'signal-negative',
    def: 'When a piece crosses out of jazz territory into classical, easy listening, or ambient. Justin wants the rhythmic identity, harmonic language, and improvisational freedom of jazz even in quiet, spacious pieces. Without those, a track might be beautiful but it\'s not what he\'s here for.',
    examples: 'A Single Petal of a Rose (7) — "likes it but feels it\'s not jazzy enough."',
    quote: null,
  },
];

const CONTEXTUAL_SIGNALS = [
  {
    name: 'Cool',
    signal: 'Amplifier',
    signalClass: 'signal-context',
    def: 'Not temperature — attitude. An effortless confidence that makes you feel cooler just listening to it. Related to "fuck-you attitude" but lighter. A track can be cool without being defiant. Cool is the swagger, fuck-you is the commitment.',
    examples: 'Early Summer (7) — "very cool." Don\'t Let Me Be Misunderstood (6) — "cool!" Strode Rode (8) — "really cool."',
    quote: null,
  },
  {
    name: 'Fun',
    signal: 'Amplifier',
    signalClass: 'signal-context',
    def: 'Tracks that are genuinely enjoyable to listen to — not profound, not challenging, just a good time. Fun alone doesn\'t make a masterpiece, but it prevents a track from feeling like homework. Often associated with groove, playfulness, and accessible energy.',
    examples: 'Tezeta (9) — "very fun and contemporary." Fables of Faubus (7.5) — "another fun one." The Bridge (6) — "surprisingly fun." Moanin\'/Blakey (7.5) — "whole thing is fun."',
    quote: null,
  },
  {
    name: 'Predictable',
    signal: 'Replay killer',
    signalClass: 'signal-context',
    def: 'When you know where a track is going before it gets there. A track can be good on first listen but predictable on second. This tanks replayability more than rating — the initial experience might be fine, but there\'s no reason to come back.',
    examples: 'Song for My Father (5) — "a little predictable to come back to."',
    quote: null,
  },
  {
    name: 'Grows On You',
    signal: 'Slow burn',
    signalClass: 'signal-context',
    def: 'Tracks that don\'t land immediately but reveal themselves over time or across sections. A track that starts meh but earns its rating through a specific moment or shift. The opposite of front-loaded — back-loaded tracks that reward patience.',
    examples: 'Strode Rode (8) — "at first didn\'t like it but when the drum breaks came in — that was sick." Song for My Father (5) — "at first eh, but then solos were playful and fun."',
    quote: null,
  },
  {
    name: 'Basic',
    signal: 'Mild negative',
    signalClass: 'signal-context',
    def: 'Pleasant but lacking depth or distinctiveness. A track that\'s fine but doesn\'t assert a personality. Not flat (which is invisible) — basic is visible but unremarkable. It does what you\'d expect and nothing more.',
    examples: 'In Your Own Sweet Way (6) — "good but kind of basic in taste."',
    quote: null,
  },
];

function AttrCard({ attr }) {
  return (
    <div className="attr-card">
      <div className="attr-header">
        <span className="attr-name">{attr.name}</span>
        <span className={`attr-signal ${attr.signalClass}`}>{attr.signal}</span>
      </div>
      <div className="attr-def">{attr.def}</div>
      <div className="attr-examples">
        <strong>Examples:</strong> {attr.examples}
      </div>
      {attr.quote && <div className="attr-quote">{attr.quote}</div>}
    </div>
  );
}

export default function Dictionary() {
  return (
    <>
      <Navigation showSections={false} />
      <div className="dictionary-wrapper">
        <div className="dictionary-header">
          <p className="eyebrow">Jazz Taste Model</p>
          <h1>Attribute Dictionary</h1>
          <p className="subtitle">
            The personal vocabulary Justin uses to describe what works and what doesn't.
            These are the words that predict ratings better than any audio feature.
          </p>
        </div>

        <div className="dict-section">
          <h2>Positive Signals — What Makes a Track Land</h2>
          {POSITIVE_SIGNALS.map(attr => (
            <AttrCard key={attr.name} attr={attr} />
          ))}
        </div>

        <div className="dict-section">
          <h2>Negative Signals — What Kills a Track</h2>
          {NEGATIVE_SIGNALS.map(attr => (
            <AttrCard key={attr.name} attr={attr} />
          ))}
        </div>

        <div className="dict-section">
          <h2>Contextual Signals — Modifiers That Shape the Rating</h2>
          {CONTEXTUAL_SIGNALS.map(attr => (
            <AttrCard key={attr.name} attr={attr} />
          ))}
        </div>
      </div>
    </>
  );
}
