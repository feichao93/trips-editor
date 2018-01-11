import * as d3 from 'd3'
import xs from 'xstream'
import { Stream } from 'xstream'
import { MAX_SCALE, MIN_SCALE } from './constants'

export type PaintSink = Stream<{
  svg: SVGSVGElement
  interaction: string
}>

export default function makePaintDriver() {
  return function paintDriver(paint$: PaintSink) {
    const zoom = d3.zoom().scaleExtent([MIN_SCALE, MAX_SCALE])

    // 记录当前zoom功能是否开启
    let on = false

    paint$.addListener({
      next({ svg, interaction }) {
        if (interaction === 'idle' && !on) {
          d3.select(svg).call(zoom)
          on = true
        } else if (interaction !== 'idle' && on) {
          d3.select(svg).on('.zoom', null)
          on = false
        }
      },
      error(e) {
        throw e
      },
    })

    const transform$ = xs
      .create<d3.ZoomTransform>({
        start(observer) {
          zoom.on('zoom', () => {
            observer.next(d3.event.transform)
          })
        },
        stop() {},
      })
      .startWith(d3.zoomIdentity)

    return xs.combine(transform$).map(([transform]) => ({ transform }))
  }
}
