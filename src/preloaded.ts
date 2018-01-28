import { complement } from 'ramda'
import xs, { Stream } from 'xstream'
import dropRepeats from 'xstream/extra/dropRepeats'
import sampleCombine from 'xstream/extra/sampleCombine'
import { Point } from './interfaces'
import peek from './utils/peek'
import when from './utils/when-operator'

declare global {
  interface Event {
    ownerTarget: HTMLElement
  }
}

declare module '@cycle/isolate' {
  export default function isolate<InnerSo, InnerSi>(
    component: Component<InnerSo, InnerSi>,
    scope?: any,
  ): Component<InnerSo, InnerSi>
}

Stream.prototype.peek = function<T, U>(this: Stream<T>, peekStream: Stream<U>) {
  return this.compose(peek(peekStream))
}
Stream.prototype.when = function<T, U>(
  this: Stream<T>,
  peekStream: Stream<U>,
  filterFn: (u: U) => boolean = Boolean,
) {
  return this.compose(when(peekStream, filterFn))
}
Stream.prototype.whenNot = function<T, U>(
  this: Stream<T>,
  peekStream: Stream<U>,
  filterFn: (u: U) => boolean = Boolean,
) {
  return this.when(peekStream, complement(filterFn))
}
Stream.prototype.sampleCombine = function(...args: any[]) {
  return this.compose(sampleCombine(...args))
}
Stream.prototype.combine = function(...args: any[]) {
  return xs.combine(this, ...args) as any
}
Stream.prototype.dropRepeats = function(isEqual) {
  return this.compose(dropRepeats(isEqual))
}
Stream.prototype.checkedFlatMap = function(checkFn: any, mapFn: any) {
  if (mapFn === undefined) {
    mapFn = checkFn
    checkFn = Boolean
  }
  return this.map((t: any) => (checkFn(t) ? mapFn(t) : xs.of(null))).flatten()
} as any

interface InlineCombineSignature<T> {
  (): Stream<[T]>
  <T1>(s1: Stream<T1>): Stream<[T, T1]>
  <T1, T2>(s1: Stream<T1>, s2: Stream<T2>): Stream<[T, T1, T2]>
  <T1, T2, T3>(s1: Stream<T1>, s2: Stream<T2>, s3: Stream<T3>): Stream<[T, T1, T2, T3]>
  <T1, T2, T3, T4>(s1: Stream<T1>, s2: Stream<T2>, s3: Stream<T3>, s4: Stream<T4>): Stream<
    [T, T1, T2, T3, T4]
  >
  <T1, T2, T3, T4, T5>(
    s1: Stream<T1>,
    s2: Stream<T2>,
    s3: Stream<T3>,
    s4: Stream<T4>,
    s5: Stream<T5>,
  ): Stream<[T, T1, T2, T3, T4, T5]>
}

declare module 'xstream' {
  interface Stream<T> {
    peek<U>(peekStream: Stream<U>): Stream<U>
    when<U>(peekStream: Stream<U>, filterFn?: (u: U) => boolean): this
    whenNot<U>(peekStream: Stream<U>, filterFn?: (u: U) => boolean): this
    combine: InlineCombineSignature<T>
    sampleCombine: InlineCombineSignature<T>
    dropRepeats(isEqual?: ((x: T, y: T) => boolean)): Stream<T>

    /** Like flatMap, but will check the value using `checkFn` before call `mapFn`.
     * If `checkFn(t)` returns false, then the result stream will just emit **one null** for this `t`,
     * else the result stream will emit `mapFn(t)`.
     */
    checkedFlatMap<U>(checkFn: (t: T) => boolean, mapFn: (t: T) => Stream<U>): Stream<U>
    checkedFlatMap<U>(/* checkFn = Boolean */ mapFn: (t: T) => Stream<U>): Stream<U>
  }
}

declare module 'd3-zoom' {
  interface ZoomTransform {
    invertPos(p: Point): Point
    applyPos(p: Point): Point
  }
}

const { Transform } = require('d3-zoom/src/transform')
Transform.prototype.invertPos = function invertPos(p: Point): Point {
  const [x, y] = this.invert([p.x, p.y])
  return { x, y }
}
Transform.prototype.applyPos = function applyPos(p: Point): Point {
  const [x, y] = this.apply([p.x, p.y])
  return { x, y }
}
