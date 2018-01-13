import xs, { Stream } from 'xstream'
import peek from './utils/peek'
import peekFilter from './utils/peekFilter'
import sampleCombine from 'xstream/extra/sampleCombine'

Stream.prototype.peek = function<T, U>(this: Stream<T>, peekStream: Stream<U>) {
  return this.compose(peek(peekStream))
}
Stream.prototype.peekFilter = function<T, U>(
  this: Stream<T>,
  peekStream: Stream<U>,
  filterFn: (u: U) => boolean,
) {
  return this.compose(peekFilter(peekStream, filterFn))
}
Stream.prototype.sampleCombine = function(...args: any[]) {
  return this.compose(sampleCombine(...args))
}
Stream.prototype.combine = function(...args: any[]) {
  return xs.combine(this, ...args) as any
}

interface InlineCombineSignature<T> {
  (): Stream<[T]>
  <T1>(s1: Stream<T1>): Stream<[T, T1]>
  <T1, T2>(s1: Stream<T1>, s2: Stream<T2>): Stream<[T, T1, T2]>
  <T1, T2, T3>(s1: Stream<T1>, s2: Stream<T2>, s3: Stream<T3>): Stream<[T1, T2, T3]>
  <T1, T2, T3, T4>(s1: Stream<T1>, s2: Stream<T2>, s3: Stream<T3>, s4: Stream<T4>): Stream<
    [T1, T2, T3, T4]
  >
  <T1, T2, T3, T4, T5>(
    s1: Stream<T1>,
    s2: Stream<T2>,
    s3: Stream<T3>,
    s4: Stream<T4>,
    s5: Stream<T5>,
  ): Stream<[T1, T2, T3, T4, T5]>
}

declare module 'xstream' {
  interface Stream<T> {
    peek<U>(peekStream: Stream<U>): Stream<U>
    peekFilter<U>(peekStream: Stream<U>, filterFn: (u: U) => boolean): Stream<T>
    combine: InlineCombineSignature<T>
    sampleCombine: InlineCombineSignature<T>
  }
}
