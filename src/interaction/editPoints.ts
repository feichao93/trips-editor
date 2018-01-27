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
  keyboard,
  selection: sel$,
}) => {
  const toggleSelectionMode$ = keyboard
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

  const startFromMouseDown$: Stream<EditPointStartInfo> = mouse.down$
    .when(mode$, identical('idle'))
    .whenNot(mouse.vertexIndex$, identical(-1))
    .when(sel$, sel => sel.mode === 'vertices')
    .sampleCombine(mouse.vertexIndex$, sel$, state$)
    .map(([pos, vertexIndex, sel, state]) => ({
      startPos: pos,
      item: sel.item(state).setIn(['points', vertexIndex], pos),
      vertexIndex,
    }))

  const startInfo$ = xs.merge(startFromAdd$, startFromMouseDown$)

  const nextAdjustConfigs$ = startInfo$
    .map(({ item, vertexIndex }) =>
      xs.merge(
        mouse.move$
          .peek(state$)
          .map(state => [
            { type: 'align', exclude: [state.getIn(['items', item.id, 'points', vertexIndex])] },
          ])
          .startWith([{ type: 'align', exclude: [] }])
          .endWhen(mouse.up$),
        mouse.up$.mapTo([]),
      ),
    )
    .flatten()

  const movingInfo$ = startInfo$
    .map(({ item, startPos, vertexIndex }) =>
      mouse.amove$
        .map(movingPos => {
          const dx = movingPos.x - startPos.x
          const dy = movingPos.y - startPos.y
          return [item, vertexIndex, dx, dy]
        })
        .endWhen(mouse.up$),
    )
    .flatten()
  const movePoint$ = movingInfo$.map(actions.moveVertex)

  const deletePoint$ = keyboard
    .keyup('d')
    .whenNot(mouse.vertexIndex$, identical(-1))
    .peek(xs.combine(sel$, mouse.vertexIndex$))
    .map(actions.deleteVertex)

  return {
    changeSelection: toggleSelectionMode$,
    action: xs.merge(movePoint$, addPointConfig$.map(actions.addVertex), deletePoint$),
    nextVertexIndex: xs.merge(
      deletePoint$.mapTo(-1),
      startFromAdd$.map(startInfo => startInfo.vertexIndex),
    ),
    nextAdjustConfigs: nextAdjustConfigs$ as any,
  }
}

export default editPoints
