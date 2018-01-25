import { h, VNode } from '@cycle/dom'
import { List } from 'immutable'
import { always, identical } from 'ramda'
import xs, { Stream } from 'xstream'
import actions from '../actions'
import { SENSE_RANGE } from '../constants'
import { AdjustConfig, InteractionFn, Point, PolygonItem, Updater } from '../interfaces'
import { distanceBetweenPointAndPoint, injectItemId } from '../utils/common'
import { selectionUtils } from '../utils/Selection'

/** Implementation for drawing polygon interaction.
 * Steps to draw a polygon:
 * 1. In `idle` mode, press shortcut `Q` to enter `polygon` mode;
 * 2. In `polygon` mode, every click will lead to adding one point to the polygon;
 * 3. When the drawing polygon is closed, a new polygon item is created;
 * 4. After new polygon is created, the mode will change back to `idle`.
 *
 * Note that we set `adjustConfigs` when drawing a new polygon, so we use adjusted
 *  positions like `mouse.aclick$` instead of raw positions like `mouse.click$`.
 */
const drawPolygon: InteractionFn = ({ mouse, mode: mode$, keyboard, transform: transform$ }) => {
  const addPointProxy$ = xs.create<Point>()
  const resetPointsProxy$ = xs.create()

  const changePoints$: Stream<Updater<List<Point>>> = xs.merge(
    addPointProxy$.map(p => (points: List<Point>) => points.push(p)),
    resetPointsProxy$.mapTo(always(List<Point>())),
  )

  // The points of polygon under drawing
  const points$ = changePoints$.fold((points, updater) => updater(points), List<Point>())

  // Whether the user can close the polygon and add a new polygon item
  const canClose$ = xs
    .combine(mouse.move$, transform$)
    .sampleCombine(points$)
    .map(
      ([[movingPos, transform], points]) =>
        points.count() >= 3 &&
        distanceBetweenPointAndPoint(points.first(), movingPos) < SENSE_RANGE / transform.k,
    )
    .dropRepeats()
    .startWith(false)

  // Step 1
  const toPolygonMode$ = keyboard.shortcut('q').mapTo('polygon')
  const adjustInPolygonMode$ = toPolygonMode$.mapTo<AdjustConfig[]>([
    { type: 'cement' },
    { type: 'align' },
  ])

  // Step 2
  const addPoint$ = mouse.aclick$.when(mode$, identical('polygon')).whenNot(canClose$)
  addPointProxy$.imitate(addPoint$)

  // Step 3
  const close$ = mouse.click$.when(canClose$)

  const newItem$ = close$
    .peek(points$)
    .map(PolygonItem.fromPoints)
    .map(injectItemId)

  // Step 4
  const toIdleMode$ = newItem$.mapTo('idle')
  const resetAdjust$ = toIdleMode$.mapTo([])

  const addItem$ = newItem$.map(actions.addItem)
  resetPointsProxy$.imitate(xs.merge(addItem$, toPolygonMode$))

  // 记录当前正在绘制的多边形的预览
  const drawingPolygon$ = mode$
    .checkedFlatMap(identical('polygon'), () =>
      canClose$
        .map(canClose => {
          if (canClose) {
            return points$.map(points => PolygonItem.preview([points.first(), points]))
          } else {
            return mouse.amove$
              .sampleCombine(points$)
              .map(([movingPos, points]) => PolygonItem.preview([movingPos, points]))
          }
        })
        .flatten(),
    )
    .startWith(null)

  const closeIndicator$: Stream<VNode> = xs
    .combine(mode$, canClose$)
    .checkedFlatMap(
      ([mode, canClose]) => mode === 'polygon' && canClose,
      () => points$.map(points => points.first()),
    )
    .checkedFlatMap(p =>
      transform$.map(transform =>
        h('circle.close-indicator', {
          attrs: {
            cx: p.x,
            cy: p.y,
            fill: 'red',
            opacity: 0.3,
            r: SENSE_RANGE / transform.k,
          },
        }),
      ),
    )
    .startWith(null)

  return {
    drawingItem: drawingPolygon$,
    action: addItem$,
    nextMode: xs.merge(toPolygonMode$, toIdleMode$),
    changeSelection: newItem$.map(selectionUtils.selectItem),
    addons: { polygonCloseIndicator: closeIndicator$ },
    nextAdjustConfigs: xs.merge(adjustInPolygonMode$, resetAdjust$),
  }
}

export default drawPolygon
