import * as R from 'ramda'
import xs, { Stream } from 'xstream'
import actions, { State } from '../actions'
import { Mouse } from '../interfaces'
import { containsPoint, moveItems } from '../utils/common'

export default function dragItems(
  mouse: Mouse,
  mode$: Stream<string>,
  state$: Stream<State>,
  resizer$: Stream<string>,
) {
  const dragStart$ = xs
    .merge(
      mouse.down$.map(pos => ({ type: 'down', pos })),
      mouse.up$.map(pos => ({ type: 'up', pos })),
    )
    .peekFilter(resizer$, R.identical(null))
    .peekFilter(mode$, R.equals('idle'))
    .sampleCombine(state$)
    .map(([{ type, pos }, state]) => {
      if (type === 'down') {
        const clickedItems = state.items.filter(item => containsPoint(item, pos))
        const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
        // TODO 目前仅支持单个元素的拖动
        return { startPos: pos, startItems: state.items.filter(item => item.id === targetItemId) }
      } else {
        return null
      }
    })
    .startWith(null)

  const dragItems$ = dragStart$
    .map(dragStart => {
      return mouse.move$.map(pos => {
        if (dragStart == null) {
          return null
        } else {
          const { startItems, startPos } = dragStart
          const dx = pos.x - startPos.x
          const dy = pos.y - startPos.y
          const movedItems = moveItems(startItems, dx, dy)
          return actions.moveItems(movedItems)
        }
      })
    })
    .flatten()
    .filter(R.identity)

  return dragItems$
}
