import './preloaded'
import { makeDOMDriver } from '@cycle/dom'
import { run } from '@cycle/run'
import 'normalize.css'
import App from './App'
import makeShortcutDriver from './makeShortcutDriver'
import makeWindowEventDriver from './makeWindowEventDriver'

run(App, {
  DOM: makeDOMDriver('#container'),
  shortcut: makeShortcutDriver(),
  mouseup: makeWindowEventDriver('mouseup'),
  mousemove: makeWindowEventDriver('mousemove'),
})
