import * as R from 'ramda'
import xs, { Stream } from 'xstream'
import { Item, ItemId, Mouse, Point, Rect, ResizeDirConfig, Selection } from '../interfaces'
import { Action, State } from '../actions'
import { getBoundingBoxOfPoints, getItemPoints } from '../utils/common'
import { OrderedMap } from 'immutable'
import PolygonItemHelper from '../utils/PolygonItemHelper'

// TODO 该文件还可以进行优化

export interface ResizingInfo {
  movingPos: Point
  startPos: Point
  selection: OrderedMap<ItemId, Item>
  anchor: Point
  resizeDirConfig: ResizeDirConfig
}

export default function resizeItems(
  mouse: Mouse,
  mode$: Stream<string>,
  selection$: Stream<Selection>,
  resizer$: Stream<string>,
) {
  const startInfo$ = xs
    .merge(
      mouse.down$.map(pos => ({ type: 'down', pos })).peekFilter(resizer$, R.identity),
      mouse.up$.map(pos => ({ type: 'up', pos })),
    )
    .peekFilter(mode$, R.identical('idle'))
    .sampleCombine(resizer$, selection$)
    .map(([{ type, pos }, resizer, selection]) => {
      const bbox = getBoundingBoxOfPoints(selection.toList().flatMap(getItemPoints))
      if (bbox != null && type === 'down') {
        return {
          startPos: pos,
          selection,
          anchor: resolveAnchor(resizer, bbox),
          resizeDirConfig: resolveResizeDirConfig(resizer),
        }
      } else {
        return null
      }
    })

  const resizingInfo$ = startInfo$
    .map(startInfo => {
      if (startInfo == null) {
        return xs.of<ResizingInfo>(null)
      }
      return mouse.move$.map(movingPos => ({
        movingPos,
        startPos: startInfo.startPos,
        selection: startInfo.selection,
        anchor: startInfo.anchor,
        resizeDirConfig: startInfo.resizeDirConfig,
      }))
    })
    .flatten()

  const resizeAction$: Stream<Action> = resizingInfo$
    .filter(R.identity)
    .map(({ selection, anchor, resizeDirConfig, startPos, movingPos }) => (state: State) =>
      state.mergeIn(
        ['items'],
        selection.map(item =>
          PolygonItemHelper.resize(item, anchor, resizeDirConfig, startPos, movingPos),
        ),
      ),
    )

  return {
    action$: resizeAction$,
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
