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

  const startInfo$: Stream<EditPointStartInfo> = xs
    .combine(mode$, mouse.vertexIndex$, sel$)
    .checkedFlatMap(
      ([mode, vertexIndex, sel]) =>
        mode === 'idle' && vertexIndex !== -1 && sel.mode === 'vertices',
      ([mode, vertexIndex, sel]) =>
        mouse.down$.sampleCombine(state$).map(([pos, state]) => {
          const item = state.items.get(sel.sids.first())
          return { startPos: pos, item, vertexIndex }
        }),
    )

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
    action: movePoint$,
  }
}

export default editPoints
