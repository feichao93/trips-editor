import xs, { Stream } from 'xstream'
import actions from '../actions'
import { InteractionFn, Item, Point } from '../interfaces'

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
  selection: selection$,
}) => {
  const start$ = shortcut.shortcut('e').when(selection$, sel => !sel.isEmpty())

  const nextSelection$ = start$.peek(selection$).map(sel => sel.toggleMode())

  const startInfo$: Stream<EditPointStartInfo> = xs.combine(mode$, selection$).checkedFlatMap(
    ([mode, sel]) => mode === 'idle' && sel.mode === 'vertices',
    ([mode, sel]) =>
      xs
        .merge(
          mouse.down$.map(pos => ({ type: 'down', pos })),
          mouse.up$.map(pos => ({ type: 'up', pos })),
        )
        .sampleCombine(state$, mouse.vertexIndex$)
        .map(([{ type, pos }, state, vertexIndex]) => {
          if (type === 'up' || vertexIndex === -1) {
            return null
          } else {
            const item = state.items.get(sel.sids.first())
            return { startPos: pos, item, vertexIndex }
          }
        }),
  )

  const movingInfo$ = startInfo$.checkedFlatMap(
    ({ item, startPos, vertexIndex }) =>
      mouse.move$.map(movingPos => {
        const dx = movingPos.x - startPos.x
        const dy = movingPos.y - startPos.y
        return [item, vertexIndex, dx, dy]
      }),
    // TODO have a try? .endWhen(mouse.up$),
  )
  const movePoint$ = movingInfo$.filter(Boolean).map(actions.movePoint)

  return {
    nextSelection: nextSelection$,
    action: movePoint$,
  }
}

export default editPoints
