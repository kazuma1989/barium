import { reduce, reduced } from 'lajure';
import { PieceType, State, vacant, wall, Player, Piece } from './game';

// 点数計算のために駒のタイプを拡張する
Object.assign(PieceType, {
  chickInEnemyArea: 11,
  catInEnemyArea: 13,
  caughtLion: 16,
});

const MAX_POINT = 1000000;

const rule = new Map([
  [PieceType.chick, 100],
  [PieceType.chicken, 1200],
  [PieceType.cat, 1000],
  [PieceType.powerUpCat, 1200],
  [PieceType.dog, 1400],
  [PieceType.lion, 10000],
  [PieceType.chickInEnemyArea, 600],
  [PieceType.catInEnemyArea, 1100],
  [PieceType.caughtLion, MAX_POINT],
]);

// 状態を評価します。
function evaluate(state) {
  const pointForBoard = state.board.reduce((acc, piece, index, board) => {
    if (piece.type === PieceType.wall || piece.type === PieceType.vacant) {
      return acc + 0;
    }

    const player = piece.owner === state.player ? 1 : -1;
    const inEnemyArea = piece.owner === Player.white ? index >= 36 : index <= 19;

    let type;
    switch (piece.type) {
      case PieceType.chick:
        type = inEnemyArea ? PieceType.chickInEnemyArea : PieceType.chick;
        break;

      case PieceType.cat:
        type = inEnemyArea ? PieceType.catInEnemyArea : PieceType.cat;
        break;

      default:
        type = piece.type;
    }

    let bibiri = 1.0;
    // if (state.player === Player.white) {
    //   if (piece.owner === Player.white && board[index + 14]) {
    //     bibiri = board[index + 14].owner === Player.black ? 1.5 : 1.0;
    //   }
    // }
    // if (state.player === Player.black) {
    //   if (piece.owner === Player.black && board[index - 14]) {
    //     bibiri = board[index - 14].owner === Player.white ? 1.5 : 1.0;
    //   }
    // }

    return acc + rule.get(type) * bibiri * player;
  }, 0);

  const pointForCaptured = state.capturedPieces.reduce((acc, piece, index) => {
    const player = 1;

    let type;
    switch (piece.type) {
      case PieceType.lion:
        type = PieceType.caughtLion;
        break;

      default:
        type = piece.type;
    }

    return acc + rule.get(type) * player;
  }, 0);

  const pointForCapturedEnemy = state.enemyCapturedPieces.reduce((acc, piece, index) => {
    const player = -1;

    let type;
    switch (piece.type) {
      case PieceType.lion:
        type = PieceType.caughtLion;
        break;

      default:
        type = piece.type;
    }

    return acc + rule.get(type) * player;
  }, 0);

  return pointForBoard + pointForCaptured + pointForCapturedEnemy;
}

// スコアのメモ。
const memos = new Map();

// アルファ・ベータ法（正しくはネガ・アルファ法）で、盤面のスコアを計算します。
function getScore(state, depth, alpha, beta) {
  const hashcode = state.hashcode();
  const memo = memos.get(hashcode);

  // 過去に同じ盤面のスコアを計算していた場合は、その値をそのまま返します。ハッシュ値がたまたま等しい異なる状態の場合は不正な動作になりますけど、気にしない方向で。HashMap欲しいなぁ……。
  if (memo && memo.depth >= depth && memo.alpha <= alpha && memo.beta >= beta) {
    return memo.score;
  }

  // 勝者が確定している場合は、探索を止めて大きな値を返します。
  if (state.winner) {
    return state.winner === state.player ? MAX_POINT : -MAX_POINT;
  }

  // 指定した深さまで探索した場合は、盤面を評価してスコアとします。
  if (depth === 1) {  // 外側で余分に一回回しているので、depth === 0じゃなくて1にしました。
    return evaluate(state);
  }

  // そうでなければ、合法手を使って1手進めた盤面で自分自身を呼び出して、スコアを計算します。
  const score = reduce((acc, move) => {
    const score = -getScore(state.doMove(move), depth - 1, -beta, -acc);
    const nextAcc = score > acc ? score : acc;

    return nextAcc >= beta ? reduced(nextAcc) : nextAcc;
  }, alpha, state.getLegalMoves());

  // 計算したスコアをメモしておきます。
  memos.set(hashcode, { state: state, depth: depth, alpha: alpha, beta: beta, score: score });

  // スコアをリターンします。
  return score;
}

// 次の手を取得します。
// 手を返せるように、スコアと手の配列をaccにするアルファ・ベータ法（正しくはネガ・アルファ法）を実行します。getScoreを手も扱うように改造すればコードの重複がなくなるのですけど、配列の生成は遅そうなので、敢えてこんなコードにしてみました。
export function getMove(state) {
  const [score, move] = reduce((acc, move) => {
    const score = -getScore(state.doMove(move), 4, -MAX_POINT, -acc[0]);  // 5手読むとすげー遅かったので、読む深さは4手で。
    const nextAcc = score > acc[0] ? [score, move] : acc;  // TODO: スコアが同じ場合にランダムで入れ替えると、手に幅がでて良いかも。

    return nextAcc;
  }, [-MAX_POINT, null], state.getLegalMoves());  // TODO: 合法手が全く無い場合にnullが返るけど、大丈夫？　合法手が全くない状態が想像できないけど……。

  console.log(score);

  return move;
}
