import { useOS } from "../../store";
import Icon from "../../components/Icon";

const catalog = [
  { id: "mines", name: "Minesweeper", description: "A calm little logic challenge.", icon: "💣" },
  { id: "memory", name: "Memory Match", description: "Find every matching pair.", icon: "🧠" },
  { id: "beat", name: "Beat Tap", description: "Keep the rhythm and beat your best.", icon: "🎵" },
];

export default function Store() {
  const { prefs, setPrefs, open } = useOS();
  const installed = prefs.installedGames || [];
  return <div className="store-app">
    <header className="store-hero"><div><small>FAKEOS MARKETPLACE</small><h1>A little more fun.</h1><p>Offline games, ready whenever you are.</p></div><Icon app="Games" size={34}/></header>
    <div className="store-grid">{catalog.map(game => {
      const has = installed.includes(game.id);
      return <article className="store-card" key={game.id}><div className="store-game-icon">{game.icon}</div><h3>{game.name}</h3><p>{game.description}</p><button onClick={() => has ? open("Games", game.id) : setPrefs({ installedGames: [...installed, game.id] })}>{has ? "Play" : "Install"}</button>{has && <button className="store-remove" onClick={() => setPrefs({ installedGames: installed.filter(x => x !== game.id) })}>Remove</button>}</article>;
    })}</div><small className="store-note">All games run locally in FakeOS. No account or network needed.</small>
  </div>;
}
