import xs, { MemoryStream, Stream } from 'xstream'
import Mouse from './Mouse'
import { AdjustResult, Point } from '../interfaces'

function applyAdjuster([pos, adjuster]: [Point, (p: Point) => AdjustResult]) {
  return adjuster(pos)
}

export default class AdjustedMouse extends Mouse {
  adjustedMoveInfo$: Stream<AdjustResult> = xs.create()
  adjustedDownInfo$: Stream<AdjustResult> = xs.create()
  adjustedUpInfo$: Stream<AdjustResult> = xs.create()
  adjustedClickInfo$: Stream<AdjustResult> = xs.create()

  // Adjusted move/down/up positions
  amove$: Stream<Point> = this.adjustedMoveInfo$.map(info => info.point)
  adown$: Stream<Point> = this.adjustedDownInfo$.map(info => info.point)
  aup$: Stream<Point> = this.adjustedUpInfo$.map(info => info.point)
  aclick$: Stream<Point> = this.adjustedClickInfo$.map(info => info.point)

  /** Set the adjuster stream for the mouse.
   * This method should be called right after `Mouse#imitate()` */
  setAdjuster(adjuster$: MemoryStream<(p: Point) => AdjustResult>) {
    this.adjustedMoveInfo$.imitate(this.move$.sampleCombine(adjuster$).map(applyAdjuster))
    this.adjustedUpInfo$.imitate(this.up$.sampleCombine(adjuster$).map(applyAdjuster))
    this.adjustedDownInfo$.imitate(this.down$.sampleCombine(adjuster$).map(applyAdjuster))
    this.adjustedClickInfo$.imitate(this.click$.sampleCombine(adjuster$).map(applyAdjuster))
  }
}
