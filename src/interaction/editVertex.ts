import { identical } from 'ramda'
import xs, { Stream } from 'xstream'
import DeleteVertexAction from '../actions/DeleteVertexAction'
import InsertVertexAction from '../actions/InsertVertexAction'
import MoveVertexAction from '../actions/MoveVertexAction'
import ToggleSelModeAction from '../actions/ToggleSelModeAction'
import { Component, Item, Point } from '../interfaces'

interface EditVertexStartInfo {
  startPos: Point
  item: Item
  vertexIndex: number
}

const editVertex: Component = ({ UI, mouse, state: state$, mode: mode$, keyboard }) => {
  /** Toggle Selection Mode */
  const toggleSelMode$ = xs
    .merge(keyboard.shortcut('e'), UI.intent('toggle-sel-mode'))
    .when(mode$, identical('idle'))
    .map(() => new ToggleSelModeAction())

  /** Add/move vertex */
  const insertVertexConfig$ = mouse.down$
    .whenNot(mouse.vertexInsertIndex$, identical(-1))
    .sampleCombine(mouse.vertexInsertIndex$)

  const startFromAdd$: Stream<EditVertexStartInfo> = insertVertexConfig$
    .map(([pos, vertexInsertIndex]) =>
      state$
        .drop(1) // state$ is a memory-stream, so we drop the current state
        .take(1) // Use the next state (state that contains the added-vertex)
        .map(state => ({
          startPos: pos,
          item: state.sitem(),
          vertexIndex: vertexInsertIndex,
        })),
    )
    .flatten()

  const startFromMouseDown$: Stream<EditVertexStartInfo> = mouse.down$
    .when(mode$, identical('idle'))
    .whenNot(mouse.vertexIndex$, identical(-1))
    .when(state$, state => state.selMode === 'vertices')
    .sampleCombine(mouse.vertexIndex$, state$)
    .map(([pos, vertexIndex, state]) => ({
      startPos: pos,
      item: state.sitem().setIn(['points', vertexIndex], pos),
      vertexIndex,
    }))

  const startInfo$ = xs.merge(startFromAdd$, startFromMouseDown$)

  const stopMoving$ = xs.merge(mouse.up$, mouse.vertexIndex$.filter(identical(-1)))

  const toVertexMovingMode$ = startInfo$
    .mapTo(
      mouse.move$
        .endWhen(stopMoving$)
        .mapTo('vertex.moving')
        .take(1),
    )
    .flatten()

  const nextEditingItemId$ = toVertexMovingMode$
    .peek(startInfo$)
    .map(startInfo => startInfo.item.id)

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

  const moveVertex$ = startInfo$
    .map(({ item, startPos, vertexIndex }) =>
      mouse.amove$
        .when(mode$, identical('vertex.moving'))
        .map(movingPos => new MoveVertexAction({ item, vertexIndex, startPos, movingPos }))
        .endWhen(stopMoving$),
    )
    .flatten()

  const toIdleMode$ = mouse.up$.when(mode$, identical('vertex.moving')).mapTo('idle')

  /** Delete Vertex */
  const deleteVertex$ = keyboard
    .shortcut('d')
    .peek(mouse.vertexIndex$)
    .filter(vi => vi !== -1)
    .map(vertexIndex => new DeleteVertexAction(vertexIndex))

  return {
    action: xs.merge(
      toggleSelMode$,
      moveVertex$,
      insertVertexConfig$.map(config => new InsertVertexAction(config)),
      deleteVertex$,
    ),
    nextVertexIndex: xs.merge(
      startFromAdd$.map(startInfo => startInfo.vertexIndex),
      deleteVertex$.mapTo(-1),
    ),
    nextAdjustConfigs: nextAdjustConfigs$ as any,
    nextMode: xs.merge(toVertexMovingMode$, toIdleMode$),
    nextEditingItemId: xs.merge(nextEditingItemId$, toIdleMode$.mapTo(-1)),
  }
}

export default editVertex
