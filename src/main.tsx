import { makeDOMDriver } from '@cycle/dom'
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
})

let rerun = rerunner(setup, makeDrivers)
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
