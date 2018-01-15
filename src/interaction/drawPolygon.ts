import { h, VNode } from '@cycle/dom'
import { List } from 'immutable'
import * as R from 'ramda'
import xs, { Stream } from 'xstream'
import actions from '../actions'
import { SENSE_RANGE } from '../constants'
import { InteractionFn, Point, PolygonItem, Updater } from '../interfaces'
import { distanceBetweenPointAndPoint } from '../utils/common'

const drawPolygon: InteractionFn = ({ mouse, mode: mode$, shortcut, transform: transform$ }) => {
  const start$ = shortcut.shortcut('q', 'polygon')
  const addPointProxy$ = xs.create<Point>()
  const resetPointsProxy$ = xs.create()

  const changePoints$: Stream<Updater<List<Point>>> = xs.merge(
    addPointProxy$.map(p => (points: List<Point>) => points.push(p)),
    resetPointsProxy$.mapTo(R.always(List<Point>())),
  )

  // 记录当前绘制的点
  const points$ = changePoints$.fold((points, updater) => updater(points), List<Point>())

  // 记录当前是否能够完成polygon的绘制
  const canClose$ = mouse.move$
    .combine(transform$)
    .sampleCombine(points$)
    .map(
      ([[movingPos, transform], points]) =>
        points.count() >= 3 &&
        distanceBetweenPointAndPoint(points.first(), movingPos) < SENSE_RANGE / transform.k,
    )
    .startWith(false)
    .dropRepeats()

  // 绘制一个点
  const addPoint$ = mouse.click$
    .peekFilter(mode$, R.identical('polygon'))
    .peekFilter(canClose$, R.not)
  addPointProxy$.imitate(addPoint$)

  // 闭合多边形，完成绘制
  const close$ = mouse.click$.peekFilter(canClose$, Boolean)

  const addItem$ = close$
    .peek(points$)
    .map(PolygonItem.fromPoints)
    .map(actions.addItem)
  resetPointsProxy$.imitate(addItem$)

  // 记录当前正在绘制的多边形的预览
  const drawingPolygon$ = mode$
    .checkedFlatMap(R.identical('polygon'), () =>
      mouse.move$.sampleCombine(points$).map(PolygonItem.preview),
    )
    .startWith(null)

  const closeIndicator$: Stream<VNode> = mode$
    .checkedFlatMap(R.identical('polygon'), () =>
      canClose$.checkedFlatMap(() => points$.map(points => points.first())),
    )
    .combine(transform$)
    .map(
      ([p, transform]) =>
        p == null
          ? null
          : h('circle.close-indicator', {
              attrs: {
                cx: p.x,
                cy: p.y,
                fill: 'red',
                opacity: 0.3,
                r: SENSE_RANGE / transform.k,
              },
            }),
    )

  return {
    drawingItem: drawingPolygon$,
    action: addItem$,
    nextMode: xs.merge(start$, addItem$.mapTo('idle')),
    addons: { polygonCloseIndicator: closeIndicator$ },
  }
}

export default drawPolygon
