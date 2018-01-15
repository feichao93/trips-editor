import { Stream } from 'xstream'

export default function makeTitleDriver() {
  return function titleDriver(sinks: Stream<string>) {
    sinks.addListener({
      next(s) {
        document.title = s
      },
      error(e) {
        throw e
      },
    })
  }
}
