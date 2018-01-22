import xs, { Stream } from 'xstream'
import { AdjustResult } from './adjust'
import Mouse from './Mouse'
import { Point } from '../interfaces'

function applyAdjuster([pos, adjuster]: [Point, (p: Point) => AdjustResult]) {
  return adjuster(pos)
}

export default class AdjustedMouse extends Mouse {
  adjustedMoveInfo$: Stream<AdjustResult> = xs.create()
  adjustedDownInfo$: Stream<AdjustResult> = xs.create()
  adjustedUpInfo$: Stream<AdjustResult> = xs.create()

  // Adjusted move/down/up positions
  amove$: Stream<Point> = this.adjustedMoveInfo$.map(info => info.point)
  adown$: Stream<Point> = this.adjustedDownInfo$.map(info => info.point)
  aup$: Stream<Point> = this.adjustedUpInfo$.map(info => info.point)

  setAdjuster(adjuster$: Stream<(p: Point) => AdjustResult>) {
    this.adjustedMoveInfo$.imitate(this.move$.sampleCombine(adjuster$).map(applyAdjuster))
    this.adjustedUpInfo$.imitate(this.up$.sampleCombine(adjuster$).map(applyAdjuster))
    this.adjustedDownInfo$.imitate(this.down$.sampleCombine(adjuster$).map(applyAdjuster))
  }
}
