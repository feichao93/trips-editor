import * as R from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { InteractionFn } from '../interfaces'

const dragItems: InteractionFn = ({ mouse, mode: mode$, state: state$, resizer: resizer$ }) => {
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
        const clickedItems = state.items.filter(item => item.containsPoint(pos))
        const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
        const startItems = state.items.filter(item => item.id === targetItemId)
        if (!startItems.isEmpty()) {
          return { startPos: pos, startItems }
        }
        // TODO 支持多个元素的拖动
      }
      return null
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
          const movedItems = startItems.map(item => item.move(dx, dy))
          return actions.moveItems(movedItems)
        }
      })
    })
    .flatten()
    .filter(R.identity)

  return { action: dragItems$ }
}

export default dragItems
