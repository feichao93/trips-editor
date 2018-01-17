import xs, { Stream } from 'xstream'
import actions from '../actions'
import { InteractionFn, Item, Point } from '../interfaces'
import { selectionUtils } from '../utils/Selection'

interface EditPointStartInfo {
  startPos: Point
  item: Item
  vertexIndex: number
}

const editPoints: InteractionFn = ({
  mouse,
  state: state$,
  mode: mode$,
  shortcut,
  selection: sel$,
}) => {
  const start$ = shortcut.shortcut('e').when(sel$, sel => !sel.isEmpty())

  const addPointConfig$ = mouse.down$
    .when(mouse.vertexAddIndex$, i => i !== -1)
    .sampleCombine(sel$, mouse.vertexAddIndex$)

  const startFromAdd$ = addPointConfig$
    .map(([pos, sel, vertexAddIndex]) =>
      state$
        .drop(1) // state$ is a memory-stream, so we drop the current state
        .take(1) // Use the next state (state that contains the added-point)
        .map(state => {
          return {
            startPos: pos,
            item: sel.item(state),
            vertexIndex: vertexAddIndex + 1,
          }
        }),
    )
    .flatten()

  const startFromMouseDown$: Stream<EditPointStartInfo> = xs
    .combine(mode$, mouse.vertexIndex$, sel$)
    .checkedFlatMap(
      ([mode, vertexIndex, sel]) =>
        mode === 'idle' && vertexIndex !== -1 && sel.mode === 'vertices',
      ([mode, vertexIndex, sel]) =>
        mouse.down$
          .sampleCombine(state$)
          .map(([pos, state]) => ({ startPos: pos, item: sel.item(state), vertexIndex })),
    )
  const startInfo$ = xs.merge(startFromAdd$, startFromMouseDown$)

  const movingInfo$ = startInfo$.checkedFlatMap(({ item, startPos, vertexIndex }) =>
    mouse.move$
      .map(movingPos => {
        const dx = movingPos.x - startPos.x
        const dy = movingPos.y - startPos.y
        return [item, vertexIndex, dx, dy]
      })
      .endWhen(mouse.up$),
  )
  const movePoint$ = movingInfo$.filter(Boolean).map(actions.movePoint)

  return {
    changeSelection: start$.mapTo(selectionUtils.toggleMode()),
    action: xs.merge(movePoint$, addPointConfig$.map(actions.addPoint)),
  }
}

export default editPoints
