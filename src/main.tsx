import xs from 'xstream'
import { makeDOMDriver, object } from '@cycle/dom'
import isolate from '@cycle/isolate'
import { run, setup } from '@cycle/run'
import 'normalize.css'
import App from './App'
import makePaintDriver from './makePaintDriver'
import makeShortcutDriver from './makeShortcutDriver'

const { rerunner, restartable } = require('cycle-restart')

const makeDrivers = () => ({
  DOM: restartable(makeDOMDriver('#container'), { pauseSinksWhileReplaying: false }),
  // HTTP: restartable(makeHTTPDriver()),
  // paint: makePaintDriver(),
  shortcut: makeShortcutDriver(),
  mouseup: makeWindowEventStream('mouseup'),
  mousemove: makeWindowEventStream('mousemove'),
})

const rerun = rerunner(setup, makeDrivers, isolate)
rerun(App)

// run(App, {
//   DOM: makeDOMDriver('#container'),
//   paint: makePaintDriver(),
//   shortcut: makeShortcutDriver(),
// })

declare const module: any
if (module.hot) {
  module.hot.accept('./App', () => {
    const newApp = require('./App').default
    rerun(newApp)
  })
  module.hot.accept()
}

function makeWindowEventStream(eventType: string) {
  let callback: any
  return function eventStream() {
    return xs.create({
      start(observer) {
        callback = (e: Event) => observer.next(e)
        window.addEventListener(eventType, callback)
      },
      stop() {
        window.removeEventListener(eventType, callback)
      },
    })
  }
}
