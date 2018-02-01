import xs, { Stream, MemoryStream } from 'xstream'
import { Point } from '../interfaces'

type SimpleWheelEvent = { pos: Point; deltaY: number }

// TODO use the DOM API to get the correct offset
const offset = { top: 22, left: 0 }
const applyOffset = (p: Point) => ({ x: p.x - offset.left, y: p.y - offset.top })

export default class Mouse {
  // `move` and `up` events are from window, so they will be available in constructor
  move$: Stream<Point>
  rawMove$: Stream<Point>
  up$: Stream<Point>
  rawUp$: Stream<Point>

  // The following events are from child component.
  // We need to create an empty stream first and imitate another stream later.
  down$: Stream<Point> = xs.create()
  rawDown$: Stream<Point> = xs.create()
  click$: Stream<Point> = xs.create()
  rawClick$: Stream<Point> = xs.create()
  dblclick$: Stream<Point> = xs.create()
  rawDblclick$: Stream<Point> = xs.create()
  wheel$: Stream<SimpleWheelEvent> = xs.create()
  rawWheel$: Stream<SimpleWheelEvent> = xs.create()

  /** Indicates whether the mouse (left-button) is being pressed */
  pressing$: MemoryStream<boolean>

  /** Cursor style for SVG */
  cursor$: MemoryStream<string>

  /*
    The following streams indicating whether the mouse is over specific triggers/areas.
    resizer$ has higher priority over vertexIndex$, which means when resizer$ is not null,
    vertexIndex$ must be -1. And vertexIndex$ has higher priority over vertexInsertIndex$,
    which means when vertexIndex$ is not -1, vertexInsertIndex$ must be -1
  */
  resizer$: MemoryStream<string>
  vertexIndex$: MemoryStream<number>
  vertexInsertIndex$: MemoryStream<number>

  /** `isBusy` indicates whether the mouse is busy.
   * The mouse is busy when mouse is over specific areas (resizer/vertex/vertexInsert).
   */
  isBusy$: MemoryStream<boolean>

  // A d3.ZoomTransform stream which records the current drawing board transformation.
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
    this.rawMove$ = rawMove$.map(applyOffset)
    this.move$ = this.convert(this.rawMove$)
    this.rawUp$ = rawUp$.map(applyOffset)
    this.up$ = this.convert(this.rawUp$)
    this.resizer$ = nextResizer$.dropRepeats().startWith(null)
    this.vertexIndex$ = nextVertexIndex$.dropRepeats().startWith(-1)
    this.vertexInsertIndex$ = nextVertexInsertIndex$.dropRepeats().startWith(-1)
    this.isBusy$ = xs
      .combine(this.resizer$, this.vertexIndex$, this.vertexInsertIndex$)
      .map(
        ([resizer, vertexIndex, vertexInsertIndex]) =>
          !(resizer == null && vertexIndex === -1 && vertexInsertIndex === -1),
      )
      .remember()

    // Calculate other streams
    this.pressing$ = xs.merge(this.rawDown$.mapTo(true), this.rawUp$.mapTo(false)).startWith(false)
    this.cursor$ = xs
      .combine(this.resizer$, this.vertexIndex$, this.vertexInsertIndex$)
      .map(([resizer, vertexIndex, vertexInsertIndex]) => {
        if (vertexIndex !== -1 || vertexInsertIndex !== -1) {
          return 'crosshair'
        }
        return resizer || 'default'
      })
      .startWith('default')
  }

  private convert(rawPoint$: Stream<Point>) {
    return rawPoint$.sampleCombine(this.transform$).map(([p, transform]) => transform.invertPos(p))
  }

  private convertWheel(rawWheel$: Stream<SimpleWheelEvent>) {
    return rawWheel$
      .sampleCombine(this.transform$)
      .map(([{ pos, deltaY }, transform]) => ({ pos: transform.invertPos(pos), deltaY }))
  }

  imitate(
    rawDown$: Stream<Point>,
    rawClick$: Stream<Point>,
    rawDblclick$: Stream<Point>,
    rawWheel$: Stream<SimpleWheelEvent>,
  ) {
    this.rawDown$.imitate(rawDown$.map(applyOffset))
    this.down$.imitate(this.convert(this.rawDown$))
    this.rawClick$.imitate(rawClick$.map(applyOffset))
    this.click$.imitate(this.convert(this.rawClick$))
    this.rawDblclick$.imitate(rawDblclick$.map(applyOffset))
    this.dblclick$.imitate(this.convert(this.rawDblclick$))
    this.rawWheel$.imitate(rawWheel$.map(({ deltaY, pos }) => ({ pos: applyOffset(pos), deltaY })))
    this.wheel$.imitate(this.convertWheel(this.rawWheel$))
  }
}
