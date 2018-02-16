import xs, { MemoryStream, Stream } from 'xstream'
import { Point, State } from '../interfaces'

type SimpleWheelEvent = { pos: Point; deltaY: number }

function applyOffset(pos$: Stream<Point>, offset$: Stream<DOMRect>) {
  return pos$.sampleCombine(offset$).map(([{ x, y }, { left, top }]) => ({
    x: x - left,
    y: y - top,
  }))
}

function applyOffsetForWheel(wheel$: Stream<SimpleWheelEvent>, domRect$: Stream<DOMRect>) {
  return wheel$.sampleCombine(domRect$).map(([{ deltaY, pos }, { top, left }]) => ({
    pos: { x: pos.x - left, y: pos.y - top },
    deltaY,
  }))
}

export default class Mouse {
  svgDOMRect$: Stream<DOMRect>

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
    svgDOMRect$: MemoryStream<DOMRect>,
    state$: MemoryStream<State>,
    rawMove$: Stream<Point>,
    rawUp$: Stream<Point>,
    nextResizer$: Stream<string>,
    nextVertexIndex$: Stream<number>,
    nextVertexInsertIndex$: Stream<number>,
  ) {
    this.svgDOMRect$ = svgDOMRect$
    this.transform$ = state$
      .map(s => s.transform)
      .dropRepeats()
      .remember()
    this.rawMove$ = applyOffset(rawMove$, svgDOMRect$)
    this.move$ = this.convert(this.rawMove$)
    this.rawUp$ = applyOffset(rawUp$, svgDOMRect$)
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
        return resizer || 'auto'
      })
      .startWith('auto')
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
    this.rawDown$.imitate(applyOffset(rawDown$, this.svgDOMRect$))
    this.down$.imitate(this.convert(this.rawDown$))
    this.rawClick$.imitate(applyOffset(rawClick$, this.svgDOMRect$))
    this.click$.imitate(this.convert(this.rawClick$))
    this.rawDblclick$.imitate(applyOffset(rawDblclick$, this.svgDOMRect$))
    this.dblclick$.imitate(this.convert(this.rawDblclick$))
    this.rawWheel$.imitate(applyOffsetForWheel(rawWheel$, this.svgDOMRect$))
    this.wheel$.imitate(this.convertWheel(this.rawWheel$))
  }
}
