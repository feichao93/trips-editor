import { identical } from 'ramda'
import xs from 'xstream'
import actions from '../actions'
import { AdjustConfig, InteractionFn } from '../interfaces'
import { injectItemId, getBoundingBoxOfPoints } from '../utils/common'
import PolygonItem from '../utils/PolygonItem'
import { selectionUtils } from '../utils/Selection'

/**
 * Implementation for drawing rectangle interaction.
 * Steps to draw a rect:
 * 1. In `idle` mode, press shortcut `R` to enter `rect.ready` mode;
 * 2. Press the left mouse button to start drawing rect, the mouse position will be the
 *  **start point** of the rect; The mode will change to `rect.drawing`;
 * 3. Hold the left button and drag around, the mouse position will be the **end point**
 *  of the rect; There is a preview when dragging;
 * 4. Release the left button to determine the end point of the rect. A new rect will be
 *  added and mode changes back to `idle`.
 *
 * Note that we set `adjustConfigs` when drawing a new rect, so we use `mouse.adown$`
 *  instead of `mouse.down$`.
 */
const drawRect: InteractionFn = ({ mouse, mode: mode$, keyboard }) => {
  const toRectReadyMode$ = keyboard.shortcut('r').mapTo('rect.ready')

  const startPos$ = mouse.adown$.when(mode$, identical('rect.ready'))
  const toRectDrawingMode$ = startPos$.mapTo('rect.drawing')

  const drawingRect$ = startPos$
    .map(startPos =>
      mouse.amove$
        .when(mode$, identical('rect.drawing'))
        .map(movingPos => PolygonItem.rectFromPoints(startPos, movingPos))
        .startWith(PolygonItem.rectFromPoints(startPos, startPos)),
    )
    .flatten()

  const newItem$ = mouse.aup$
    .when(mode$, identical('rect.drawing'))
    .peek(drawingRect$)
    .filter(rect => {
      const bbox = getBoundingBoxOfPoints(rect.getPoints())
      return bbox.width * bbox.height > 0
    })
    .map(injectItemId)

  const toIdleMode$ = newItem$.mapTo('idle')

  const nextMode$ = xs.merge(toRectReadyMode$, toIdleMode$, toRectDrawingMode$)
  const nextAdjustConfigs$ = nextMode$.map<AdjustConfig[]>(nextMode => {
    if (nextMode === 'rect.ready' || nextMode === 'rect.drawing') {
      return [{ type: 'cement' }, { type: 'align' }]
    } else {
      return []
    }
  })

  return {
    drawingItem: drawingRect$,
    action: newItem$.map(actions.addItem),
    nextMode: nextMode$,
    changeSelection: newItem$.map(selectionUtils.selectItem),
    nextAdjustConfigs: nextAdjustConfigs$,
  }
}

export default drawRect
