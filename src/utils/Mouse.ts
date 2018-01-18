import xs, { Stream, MemoryStream } from 'xstream'
import { Point } from '../interfaces'

type SimpleWheelEvent = { pos: Point; deltaY: number }

export default class Mouse {
  // move and up events are from window, so it will be available in constructor
  move$: Stream<Point>
  rawMove$: Stream<Point>
  up$: Stream<Point>
  rawUp$: Stream<Point>

  // The following events are from children of the main component.
  // We need to create an empty stream first and imitate another stream later.
  down$: Stream<Point> = xs.create()
  rawDown$: Stream<Point> = xs.create()
  click$: Stream<Point> = xs.create()
  rawClick$: Stream<Point> = xs.create()
  dblclick$: Stream<Point> = xs.create()
  rawDblclick$: Stream<Point> = xs.create()
  wheel$: Stream<SimpleWheelEvent> = xs.create()
  rawWheel$: Stream<SimpleWheelEvent> = xs.create()

  /** Indicates whether the mouse is being pressed */
  pressing$: MemoryStream<boolean>

  /** Cursor style for SVG */
  cursor$: MemoryStream<string>

  // These two streams indicating whether the mouse is over specific triggers/areas
  resizer$: MemoryStream<string>
  vertexIndex$: MemoryStream<number>
  vertexInsertIndex$: MemoryStream<number>

  private transform$: MemoryStream<d3.ZoomTransform>
  constructor(
    transform$: MemoryStream<d3.ZoomTransform>,
    rawMove$: Stream<Point>,
    rawUp$: Stream<Point>,
    nextResizer$: Stream<string>,
    nextVertexIndex$: Stream<number>,
    nextVertexInsertIndex$: Stream<number>,
  ) {
    this.transform$ = transform$
    this.rawMove$ = rawMove$
    this.move$ = this.convert(rawMove$)
    this.rawUp$ = rawUp$
    this.up$ = this.convert(rawUp$)
    this.resizer$ = nextResizer$.dropRepeats().startWith(null)
    this.vertexIndex$ = nextVertexIndex$.dropRepeats().startWith(-1)
    this.vertexInsertIndex$ = nextVertexInsertIndex$.dropRepeats().startWith(-1)

    // Calculate other streams
    this.pressing$ = xs.merge(this.rawDown$.mapTo(true), this.rawUp$.mapTo(false)).startWith(false)
    this.cursor$ = xs
      .combine(this.vertexIndex$, this.resizer$)
      .map(([vertexIndex, resizer]) => {
        if (vertexIndex !== -1) {
          return 'crosshair'
        }
        return resizer || 'default'
      })
      .startWith('default')
  }

  private convert(rawPoint$: Stream<Point>) {
    return rawPoint$.sampleCombine(this.transform$).map(([p, transform]) => {
      const [x, y] = transform.invert([p.x, p.y])
      return { x, y }
    })
  }

  private convertWheel(rawWheel$: Stream<SimpleWheelEvent>) {
    return rawWheel$.sampleCombine(this.transform$).map(([{ pos, deltaY }, transform]) => {
      const [x, y] = transform.invert([pos.x, pos.y])
      return { pos: { x, y }, deltaY }
    })
  }

  imitate(
    rawDown$: Stream<Point>,
    rawClick$: Stream<Point>,
    rawDblclick$: Stream<Point>,
    rawWheel$: Stream<SimpleWheelEvent>,
  ) {
    this.rawDown$.imitate(rawDown$)
    this.down$.imitate(this.convert(rawDown$))
    this.rawClick$.imitate(rawClick$)
    this.click$.imitate(this.convert(rawClick$))
    this.rawDblclick$.imitate(rawDblclick$)
    this.dblclick$.imitate(this.convert(rawDblclick$))
    this.rawWheel$.imitate(rawWheel$)
    this.wheel$.imitate(this.convertWheel(rawWheel$))
  }
}
