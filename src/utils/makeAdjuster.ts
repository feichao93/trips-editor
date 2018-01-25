import { Record, Set } from 'immutable'
import { T } from 'ramda'
import xs, { Stream } from 'xstream'
import { distanceBetweenPointAndPoint } from './common'
import Mouse from './Mouse'
import { State } from '../actions'
import { SENSE_RANGE } from '../constants'
import { KeyboardSource } from '../makeKeyboardDriver'
import {
  AdjustConfig,
  AdjustConfigAlign,
  AdjustConfigCement,
  AdjustConfigRestrict,
  AdjustResult,
  Point,
} from '../interfaces'

const PointRecord = Record({ x: 0, y: 0 })

type AdjustFn = (
  point: Point,
  transform: d3.ZoomTransform,
  config: AdjustConfig,
  points: Set<Point>,
) => AdjustResultItem

type AdjustResultItem = {
  point: Point
  ensure: (p: Point) => boolean
  info?: Partial<{
    horizontalPoint: Point
    verticalPoint: Point
  }>
}

const adjustFn: { [key in AdjustConfig['type']]: AdjustFn } = {
  cement(point, transform, config, points) {
    config = config as AdjustConfigCement
    if (config != null) {
      // TODO 注意 Point 并不是Record subtract和union 是有问题的
      const finalPoints = points
        .map(PointRecord)
        .subtract((config.exclude || []).map(PointRecord))
        .union((config.include || []).map(PointRecord))
      const nearestPoint = finalPoints.minBy(p => distanceBetweenPointAndPoint(point, p))
      if (nearestPoint != null) {
        const nearestDistance = distanceBetweenPointAndPoint(point, nearestPoint)
        if (nearestDistance <= SENSE_RANGE / transform.k) {
          return { point: nearestPoint, ensure: T }
        }
      }
    }
    return null
  },
  align(point, transform, config, points) {
    config = config as AdjustConfigAlign
    const sense = SENSE_RANGE / transform.k
    const { exclude = [], include = [] } = config
    const finalPoints = points
      .map(PointRecord)
      .union(include.map(PointRecord))
      .subtract(exclude.map(PointRecord))

    let dyMin = sense
    let dxMin = sense

    // 横向
    let hp = null // horizontal-point
    for (const p of finalPoints) {
      const dy = Math.abs(p.y - point.y)
      if (dy <= dyMin) {
        dyMin = dy
        if (hp == null || Math.abs(p.x - point.x) < Math.abs(hp.x - point.x)) {
          hp = p
        }
      }
    }

    // 纵向
    let vp = null // vertical-point
    for (const p of finalPoints) {
      const dx = Math.abs(p.x - point.x)
      if (dx <= dxMin) {
        dxMin = dx
        if (vp == null || Math.abs(p.y - point.y) < Math.abs(vp.y - point.y)) {
          vp = p
        }
      }
    }

    const pointRecord = PointRecord(point)

    if (hp || vp) {
      return {
        type: 'align',
        point: pointRecord.set('y', hp ? hp.y : point.y).set('x', vp ? vp.x : point.x),
        ensure: T,
        info: { horizontalPoint: hp, verticalPoint: vp },
      }
    }
    return null
  },
  restrict(point, transform, config, points) {
    config = config as AdjustConfigRestrict
    const pointRecord = PointRecord(point)
    const { anchor } = config
    const dx = Math.abs(point.x - anchor.x)
    const dy = Math.abs(point.y - anchor.y)
    return {
      point: dx < dy ? pointRecord.set('x', anchor.x) : pointRecord.set('y', anchor.y),
      ensure: p => p.x === anchor.x || p.y === anchor.y,
    }
  },
}

export default function makeAdjuster(
  keyboard: KeyboardSource,
  mouse: Mouse,
  state$: Stream<State>,
  transform$: Stream<d3.ZoomTransform>,
  configs$: Stream<AdjustConfig[]>,
) {
  const allPoints$ = state$.map(state => state.items.toList().flatMap(item => item.getPoints()))

  return xs
    .combine(keyboard.isPressing('z'), configs$, transform$, allPoints$)
    .map(([disabled, configs, transform, allPoints]) => (targetPoint: Point) => {
      function reduceFn(reduction: AdjustResult, config: AdjustConfig): AdjustResult {
        const next = adjustFn[config.type](reduction.point, transform, config, Set(allPoints))
        if (next != null && reduction.ensure(next.point)) {
          return {
            point: next.point,
            applied: reduction.applied.concat([config.type]),
            ensure: point => reduction.ensure(point) && next.ensure(point),
            info: { ...reduction.info, ...next.info },
          }
        } else {
          return reduction
        }
      }

      const initial: AdjustResult = {
        point: targetPoint,
        applied: [] as string[],
        ensure: T,
        info: {},
      }
      if (disabled) {
        return initial
      } else {
        return configs.reduce(reduceFn, initial)
      }
    })
    .remember()
}
