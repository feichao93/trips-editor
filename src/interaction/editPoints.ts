import { identical } from 'ramda'
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
  const toggleSelectionMode$ = shortcut
    .shortcut('e')
    .when(sel$, sel => !sel.isEmpty())
    .mapTo(selectionUtils.toggleMode())

  const addPointConfig$ = mouse.down$
    .whenNot(mouse.vertexInsertIndex$, identical(-1))
    .sampleCombine(sel$, mouse.vertexInsertIndex$)

  const startFromAdd$: Stream<EditPointStartInfo> = addPointConfig$
    .map(([pos, sel, vertexInsertIndex]) =>
      state$
        .drop(1) // state$ is a memory-stream, so we drop the current state
        .take(1) // Use the next state (state that contains the added-point)
        .map(state => ({
          startPos: pos,
          item: sel.item(state),
          vertexIndex: vertexInsertIndex,
        })),
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

  const deletePoint$ = shortcut
    .keyup('d')
    .whenNot(mouse.vertexIndex$, identical(-1))
    .sampleCombine(sel$, mouse.vertexIndex$)
    .peek(xs.combine(sel$, mouse.vertexIndex$))
    .map(actions.deletePoint)

  return {
    changeSelection: toggleSelectionMode$,
    action: xs.merge(movePoint$, addPointConfig$.map(actions.addPoint), deletePoint$),
    nextVertexIndex: xs.merge(
      deletePoint$.mapTo(-1),
      startFromAdd$.map(startInfo => startInfo.vertexIndex),
    ),
  }
}

export default editPoints
