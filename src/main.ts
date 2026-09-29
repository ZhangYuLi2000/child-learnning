import './styles/main.css';
import { Game } from './game/Game';

const root = document.getElementById('app');
if (!root) throw new Error('找不到 #app 容器');

const game = new Game(root);
game.initialize();

if (import.meta.env.DEV) {
  (window as Window & { __game?: Game }).__game = game;
}
