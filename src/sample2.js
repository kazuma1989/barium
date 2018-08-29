import { client as WebSocketClient } from 'websocket';
import { State } from './game';
import { getMove } from './sampleAi2';

(async () => {
  // WebSocketをオープンします。
  const client = new WebSocketClient();
  client.connect('ws://localhost:8080');

  // コネクションを取得します。
  const connection = await new Promise(resolve => client.once('connect', resolve));

  let state = new State();

  // メッセージをやり取りしてゲームを進める関数を定義して、実行します。
  connection.on('message', message => {
    // 敵の手を実行して、盤面を進めます。
    const lastMove = JSON.parse(message.utf8Data).lastMove;  // 状態は自前で管理するので、lastMove以外は捨てちゃいます。
    const lastState = lastMove ? state.doMove(lastMove) : state;

    // 自分の手を実行
    // メッセージを送信します。
    const nextMove = getMove(lastState);
    connection.sendUTF(JSON.stringify(nextMove));

    // 盤面を進めます。
    state = lastState.doMove(nextMove);
  });
})();
