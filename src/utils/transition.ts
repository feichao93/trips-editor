import * as d3 from 'd3'
import xs from 'xstream'

export default function transition<T>(
  duration: number,
  start: T,
  end: T,
  interpolatorFactory: d3.InterpolatorFactory<T, T> = d3.interpolate,
) {
  let rafId: number
  return xs.create<T>({
    start(out) {
      const startTime = performance.now()
      const inp = interpolatorFactory(start, end)
      function fn() {
        const t = performance.now() - startTime
        if (t >= duration) {
          out.next(end)
          out.complete()
          return
        }
        out.next(inp(t / duration))
        rafId = requestAnimationFrame(fn)
      }
      fn()
    },
    stop() {
      cancelAnimationFrame(rafId)
    },
  })
}
