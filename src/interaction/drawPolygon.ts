import { h, VNode } from '@cycle/dom'
import { List } from 'immutable'
import { always, identical } from 'ramda'
import xs, { Stream } from 'xstream'
import AddItemAction from '../actions/AddItemAction'
import { AdjustConfig, Component, Point, PolygonItem, Updater } from '../interfaces'
import { distanceBetweenPointAndPoint } from '../utils/common'

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
const drawPolygon: Component = ({
  mouse,
  keyboard,
  UI,
  mode: mode$,
  state: state$,
  config: config$,
}) => {
  const addPointProxy$ = xs.create<Point>()
  const resetPointsProxy$ = xs.create()

  const changePoints$: Stream<Updater<List<Point>>> = xs.merge(
    addPointProxy$.map(p => (points: List<Point>) => points.push(p)),
    resetPointsProxy$.mapTo(always(List<Point>())),
  )

  // The points of current-drawing polygon
  const points$ = changePoints$.fold((points, updater) => updater(points), List<Point>())

  // Whether the user can close the polygon and add a new polygon item
  const canClose$ = xs
    .combine(mouse.move$, state$, config$)
    .sampleCombine(points$)
    .map(
      ([[movingPos, { transform }, config], points]) =>
        points.count() >= 3 &&
        distanceBetweenPointAndPoint(points.first(), movingPos) < config.senseRange / transform.k,
    )
    .dropRepeats()
    .startWith(false)

  // Step 1
  const toPolygonMode$ = xs.merge(keyboard.shortcut('p'), UI.intent('polygon')).mapTo('polygon')

  // Step 2
  const addPoint$ = mouse.aclick$.when(mode$, identical('polygon')).whenNot(canClose$)
  addPointProxy$.imitate(addPoint$)

  // Step 3
  const close$ = mouse.click$.when(canClose$)

  const newItem$ = close$.peek(points$).map(PolygonItem.fromPoints)

  // Step 4
  const toIdleMode$ = newItem$.mapTo('idle')

  const addItem$ = newItem$.map(item => new AddItemAction(item))
  resetPointsProxy$.imitate(xs.merge(addItem$, toPolygonMode$))

  // 记录当前正在绘制的多边形的预览
  const drawingPolygon$ = mode$
    .checkedFlatMap(identical('polygon'), () =>
      mouse.amove$.sampleCombine(canClose$, points$).map(([movingPos, canClose, points]) => {
        if (points.isEmpty()) {
          return null
        } else if (canClose) {
          return PolygonItem.fromPoints(points.push(points.first()))
        } else {
          return PolygonItem.fromPoints(points.push(movingPos))
        }
      }),
    )
    .startWith(null)

  const nextPolygonCloseIndicator$: Stream<VNode> = xs
    .combine(mode$, canClose$)
    .checkedFlatMap(
      ([mode, canClose]) => mode === 'polygon' && canClose,
      () => points$.map(points => points.first()),
    )
    .checkedFlatMap(p =>
      xs.combine(state$, config$).map(([{ transform }, config]) =>
        h('circle.close-indicator', {
          attrs: {
            cx: p.x,
            cy: p.y,
            fill: 'red',
            opacity: 0.3,
            r: config.senseRange / transform.k,
          },
        }),
      ),
    )
    .startWith(null)

  const nextMode$ = xs.merge(toPolygonMode$, toIdleMode$)
  const nextAdjustConfigs$ = xs
    .combine(canClose$, nextMode$, keyboard.isPressing('shift'))
    .map<Stream<AdjustConfig[]>>(([canClose, nextMode, restrict]) => {
      if (nextMode === 'polygon') {
        if (canClose) {
          return xs.of([] as AdjustConfig[])
        } else if (!restrict) {
          return xs.of([{ type: 'cement' }, { type: 'align' }] as AdjustConfig[])
        } else {
          return points$
            .map(ps => ps.last())
            .map(
              anchor =>
                [
                  { type: 'restrict', anchor },
                  { type: 'cement' },
                  { type: 'align' },
                ] as AdjustConfig[],
            )
        }
      } else {
        return xs.of([])
      }
    })
    .flatten()

  return {
    drawingItem: drawingPolygon$,
    action: addItem$,
    nextMode: nextMode$,
    nextAdjustConfigs: nextAdjustConfigs$,
    nextPolygonCloseIndicator: nextPolygonCloseIndicator$,
  }
}

export default drawPolygon
