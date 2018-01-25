import './preloaded'
import { makeDOMDriver } from '@cycle/dom'
import { run } from '@cycle/run'
import 'normalize.css'
import App from './App'
import makeKeyboardDriver from './makeKeyboardDriver'
import makeWindowEventDriver from './makeWindowEventDriver'
import makeTitleDriver from './makeTitleDriver'

run(App, {
  DOM: makeDOMDriver('#container'),
  keyboard: makeKeyboardDriver(),
  mouseup: makeWindowEventDriver('mouseup'),
  mousemove: makeWindowEventDriver('mousemove'),
  title: makeTitleDriver(),
})
