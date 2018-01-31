import { fromJS, Map } from 'immutable'
import xs, { Stream } from 'xstream'

const MouseTrap = require('mousetrap')

type Config = {
  preventDefault?: boolean
}

export class KeyboardSource {
  shortcut(key: string | string[], config?: Config): Stream<KeyboardEvent> {
    return this.getStream(key, undefined, config)
  }
  keydown(key: string | string[], config?: Config): Stream<KeyboardEvent> {
    return this.getStream(key, 'keydown', config)
  }
  keyup(key: string | string[], config?: Config): Stream<KeyboardEvent> {
    return this.getStream(key, 'keyup', config)
  }
  keypress(key: string | string[], config?: Config): Stream<KeyboardEvent> {
    return this.getStream(key, 'keypress', config)
  }

  isPressing(key: string): Stream<boolean> {
    const streamKey = fromJS({ type: 'ispressing', key })
    if (!this.streamMap.has(streamKey)) {
      const keypress$ = this.getStream(key, 'keypress')
      const keyup$ = this.getStream(key, 'keyup')
      const stream = xs
        .merge(keypress$.mapTo(true), keyup$.mapTo(false))
        .startWith(false)
        .dropRepeats()
      this.streamMap = this.streamMap.set(streamKey, stream)
    }
    return this.streamMap.get(streamKey)
  }

  private streamMap = Map<string, Stream<any>>()

  private getStream<T>(key: string | string[], type: string, config?: Config) {
    config = config || {}
    const streamKey = fromJS({ type, key })
    if (!this.streamMap.has(streamKey)) {
      const stream = xs.create({
        start(listener) {
          MouseTrap.bind(
            key,
            (e: KeyboardEvent, combo: string | string[]) => {
              listener.next(e)
              if (config.preventDefault) {
                return false
              } else {
                return true
              }
            },
            type,
          )
        },
        stop() {},
      })
      this.streamMap = this.streamMap.set(streamKey, stream)
    }
    return this.streamMap.get(streamKey)
  }
}

export default function makeKeyboardDriver() {
  return function keyboardDriver() {
    return new KeyboardSource()
  }
}
