import { Map } from 'immutable'
import { identical } from 'ramda'
import xs, { Stream } from 'xstream'
import { Action, State } from '../actions'
import { InteractionFn, Item, ItemId, Point, Rect, ResizeDirConfig } from '../interfaces'

// TODO 该文件还可以进行优化

export interface ResizingInfo {
  movingPos: Point
  startPos: Point
  startItems: Map<ItemId, Item>
  anchor: Point
  resizeDirConfig: ResizeDirConfig
}

const resizeItems: InteractionFn = ({
  mouse,
  mode: mode$,
  state: state$,
  selection: selection$,
}) => {
  const resizer$ = mouse.resizer$
  const startInfo$ = mouse.down$
    .when(resizer$)
    .when(mode$, identical('idle'))
    .sampleCombine(resizer$, state$, selection$)
    .map(([pos, resizer, state, selection]) => {
      const startItems = selection.selectedItems(state)
      const bbox = selection.getBBox(state)
      if (bbox != null) {
        return {
          startPos: pos,
          startItems,
          anchor: resolveAnchor(resizer, bbox),
          resizeDirConfig: resolveResizeDirConfig(resizer),
        }
      } else {
        return null
      }
    })

  const resizingInfo$: Stream<ResizingInfo> = startInfo$.checkedFlatMap(startInfo =>
    mouse.move$.map(movingPos => ({ movingPos, ...startInfo })).endWhen(mouse.up$),
  )

  const resizeAction$: Stream<Action> = resizingInfo$
    .filter(Boolean)
    .map(({ startItems, anchor, resizeDirConfig, startPos, movingPos }) => (state: State) => {
      const resizedItems = startItems.map(item =>
        item.resize(anchor, resizeDirConfig, startPos, movingPos),
      )
      return state.mergeIn(['items'], resizedItems)
    })

  return {
    action: resizeAction$,
  }
}

function resolveAnchor(resizer: string, rect: Rect) {
  const { x, y, width, height } = rect
  if (resizer === 'nw-resize') {
    return { x: x + width, y: y + height }
  } else if (resizer === 'n-resize') {
    return { x: 0, y: y + height }
  } else if (resizer === 'ne-resize') {
    return { x, y: y + height }
  } else if (resizer === 'w-resize') {
    return { x: x + width, y: 0 }
  } else if (resizer === 'e-resize') {
    return { x, y: 0 }
  } else if (resizer === 'sw-resize') {
    return { x: x + width, y }
  } else if (resizer === 's-resize') {
    return { x: 0, y }
  } else if (resizer === 'se-resize') {
    return { x, y }
  } else {
    throw new Error(`Invalid resizer: ${resizer}`)
  }
}

function resolveResizeDirConfig(resizer: string): ResizeDirConfig {
  if (
    resizer === 'nw-resize' ||
    resizer === 'ne-resize' ||
    resizer === 'sw-resize' ||
    resizer === 'se-resize'
  ) {
    return { h: true, v: true }
  } else if (resizer === 'n-resize' || resizer === 's-resize') {
    return { h: false, v: true }
  } else if (resizer === 'w-resize' || resizer === 'e-resize') {
    return { h: true, v: false }
  } else {
    throw new Error(`Invalid resizer: ${resizer}`)
  }
}

export default resizeItems
