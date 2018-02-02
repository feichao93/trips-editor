import { identical } from 'ramda'
import { InteractionFn, Rect, ResizeDirConfig, State } from '../interfaces'

// TODO 该文件还可以进行优化

const resizeItems: InteractionFn = ({ mouse, mode: mode$, state: state$, sel: sel$ }) => {
  const resizer$ = mouse.resizer$
  const startInfo$ = mouse.down$
    .when(mode$, identical('idle'))
    .when(resizer$)
    .sampleCombine(resizer$, state$, sel$)
    .map(([pos, resizer, state, sel]) => {
      const startItems = sel.items(state)
      // When resizer is not null, we can make sure that bbox is not null.
      const bbox = sel.getBBox(state)
      return {
        startPos: pos,
        startItems,
        anchor: resolveAnchor(resizer, bbox),
        resizeDirConfig: resolveResizeDirConfig(resizer),
      }
    })

  const resizeAction$ = startInfo$
    .checkedFlatMap(startInfo =>
      mouse.move$.map(movingPos => ({ movingPos, ...startInfo })).endWhen(mouse.up$),
    )
    .map(State.resizeItems)

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
