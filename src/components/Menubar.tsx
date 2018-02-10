import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { State, UIIntent } from '../interfaces'
import '../styles/Menubar.styl'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: Stream<UIIntent>
}

export interface MenuCategoryProps {
  active: boolean
  category: string
}

function MenuCategory({ active, category }: MenuCategoryProps, children: VNode[]) {
  return h('div.category', [
    h('div.title', { dataset: { category }, class: { active } }, category),
    h('ol.menu-item-list', { style: { display: active ? 'block' : 'none' } }, children),
  ])
}

export interface MenuItemProps {
  name: string
  hint?: string
  intent?: string
  disabled?: boolean
}

function MenuItem({ name, hint, intent, disabled }: MenuItemProps) {
  return h('li.menu-item', { dataset: { intent }, class: { disabled } }, [
    h('p', name),
    h('p.hint', hint || ''),
  ])
}

export default function Menubar(sources: Sources): Sinks {
  const domSource = sources.DOM
  const nextActiveCategoryProxy$ = xs.create<string>()

  const activeCategory$ = nextActiveCategoryProxy$.dropRepeats().startWith(null)

  const closeWhenBlur$ = domSource
    .select('.menubar')
    .events('blur')
    .mapTo(null)

  const closeWhenMakeIntent$ = domSource
    .select('.menu-item')
    .events('click')
    .filter(e => !e.ownerTarget.classList.contains('disabled'))
    .mapTo(null)

  const clickToToggleCategory$ = domSource
    .select('.category .title')
    .events('click')
    .map(e => e.ownerTarget.dataset.category)

  const mouseoverToFocusCategory$ = domSource
    .select('.category .title')
    .events('mouseover')
    .when(activeCategory$)
    .map(e => e.ownerTarget.dataset.category)

  nextActiveCategoryProxy$.imitate(
    xs.merge(
      closeWhenBlur$,
      closeWhenMakeIntent$,
      clickToToggleCategory$
        .sampleCombine(activeCategory$)
        .map(([next, active]) => (next === active ? null : next)),
      mouseoverToFocusCategory$,
    ),
  )

  const intent$ = domSource
    .select('*[data-intent]')
    .events('click')
    .filter(e => !e.ownerTarget.classList.contains('disabled'))
    .map(e => e.ownerTarget.dataset.intent as UIIntent)

  const vdom$ = xs.combine(sources.state, activeCategory$).map(([{ selIdSet }, activeCategory]) => (
    <div className="menubar" tabIndex="1">
      <MenuCategory category="File" active={activeCategory === 'File'}>
        <MenuItem name="Save as JSON" intent="save" hint="Ctrl+S" />
        <MenuItem name="Load JSON" intent="load-data" />
        <MenuItem name="Export as SVG" disabled />
        <MenuItem name="Load Image" intent="load-image" />
      </MenuCategory>
      <MenuCategory category="Edit" active={activeCategory === 'Edit'}>
        <MenuItem name="Delete Selection" disabled={selIdSet.isEmpty()} hint="D" intent="delete" />
        <MenuItem name="Toggle Lock" disabled={selIdSet.isEmpty()} hint="B" intent="toggle-lock" />
        <MenuItem name="Add Rectangle" hint="R" intent="rect" />
        <MenuItem name="Add Polygon" hint="P" intent="polygon" />
        <MenuItem name="Add Line" hint="L" intent="line" />
      </MenuCategory>
      <MenuCategory category="View" active={activeCategory === 'View'}>
        <MenuItem name="Reset Zoom" intent="reset-zoom" />
        <MenuItem name="Centralize Selection" disabled />
      </MenuCategory>
    </div>
  ))

  return {
    DOM: vdom$,
    intent: intent$,
  }
}
