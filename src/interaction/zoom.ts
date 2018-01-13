import * as d3 from 'd3'
import * as R from 'ramda'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import actions, { State } from '../actions'
import { Mouse } from '../interfaces'
import { containsPoint } from '../utils/common'
import transition from '../utils/transition'

const MIN_SCALE = 0.5
const MAX_SCALE = 4

export default function zoom(
  mouse: Mouse,
  mode$: Stream<string>,
  state$: Stream<State>,
  resizer$: Stream<string>,
) {
  const dragStart$ = xs
    .merge(
      mouse.rawDown$.map(pos => ({ type: 'down', pos })),
      mouse.rawUp$.map(pos => ({ type: 'up', pos })),
    )
    .peekFilter(mode$, R.identical('idle'))
    .peekFilter(resizer$, R.identical(null))
    .sampleCombine(state$)
    .map(([{ type, pos: rawPos }, state]) => {
      const [x, y] = state.transform.invert([rawPos.x, rawPos.y])
      const pos = { x, y }
      if (type === 'down') {
        const clickedItems = state.items.filter(item => containsPoint(item, pos))
        if (clickedItems.every(item => item.locked)) {
          return { pos: rawPos, transform: state.transform }
        }
      }
      return null
    })
    .startWith(null)

  const drag$ = dragStart$
    .map(dragStart => {
      return mouse.rawMove$.map(pos => {
        if (dragStart == null) {
          return null
        } else {
          const k = dragStart.transform.k
          const dx = pos.x - dragStart.pos.x
          const dy = pos.y - dragStart.pos.y
          return dragStart.transform.translate(dx / k, dy / k)
        }
      })
    })
    .flatten()
    .filter(R.identity)

  const zoomFromDblclick$ = mouse.rawDblclick$.map(pos => ({ pos, delta: 2, useTransition: true }))
  const zoomFromWheel$ = mouse.rawWheel$.map(({ pos, deltaY }) => ({
    pos,
    delta: 0.95 ** (deltaY / 100),
    useTransition: false,
  }))
  const zoom$ = xs
    .merge(zoomFromDblclick$, zoomFromWheel$)
    .compose(sampleCombine(state$))
    .map(([{ pos: rawPos, delta, useTransition }, state]) => {
      const { x, y, k } = state.transform
      const nextK = R.clamp(MIN_SCALE, MAX_SCALE, k * delta)
      const factor = nextK / k // 实际的放大率
      const nextX = factor * (x - rawPos.x) + rawPos.x
      const nextY = factor * (y - rawPos.y) + rawPos.y
      if (useTransition && factor !== 1) {
        return transition(250, [x, y, k], [nextX, nextY, nextK])
      } else {
        return xs.of([nextX, nextY, nextK])
      }
    })
    .flatten()
    .map(([x, y, k]) => d3.zoomIdentity.translate(x, y).scale(k))

  return { action$: xs.merge(zoom$, drag$).map(actions.updateTransform) }
}
