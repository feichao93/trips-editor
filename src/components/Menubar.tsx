import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { AppHistory, emptyAction, State, UIIntent } from '../interfaces'
import '../styles/Menubar.styl'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  mode: Stream<string>
  appHistory: Stream<AppHistory>
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

function Seperator() {
  return h('hr.seprator')
}

export default function Menubar({
  DOM: domSource,
  state: state$,
  appHistory: appHistory$,
}: Sources): Sinks {
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

  const vdom$ = xs
    .combine(state$, appHistory$, activeCategory$)
    .map(([{ selIdSet }, appHistory, activeCategory]) => (
      <div className="menubar" tabIndex="1">
        <MenuCategory category="File" active={activeCategory === 'File'}>
          <MenuItem name="Save as JSON" intent="save" />
          <MenuItem name="Load JSON" intent="load-data" />
          <MenuItem name="Export as SVG" disabled />
          <MenuItem name="Load Image" intent="load-image" />
        </MenuCategory>
        <MenuCategory category="Edit" active={activeCategory === 'Edit'}>
          <MenuItem
            name="Undo"
            disabled={appHistory.getLastAction() === emptyAction}
            hint="Ctrl+Z"
            intent="undo"
          />
          <MenuItem
            name="Redo"
            disabled={appHistory.getNextAction() === emptyAction}
            hint="Ctrl+Y"
            intent="redo"
          />
          <Seperator />
          <MenuItem
            name="Delete Selection"
            disabled={selIdSet.isEmpty()}
            hint="D"
            intent="delete"
          />
          <MenuItem
            name="Toggle Lock"
            disabled={selIdSet.isEmpty()}
            hint="B"
            intent="toggle-lock"
          />
          <MenuItem name="Toggle Selection Mode" hint="E" intent="toggle-sel-mode" />
          <Seperator />
          <MenuItem name="Add Rectangle" hint="R" intent="rect" />
          <MenuItem name="Add Polygon" hint="P" intent="polygon" />
          <MenuItem name="Add Line" hint="L" intent="line" />
        </MenuCategory>
        <MenuCategory category="View" active={activeCategory === 'View'}>
          <MenuItem
            name="Centralize Selection"
            intent="zoom-to-sel"
            disabled={selIdSet.isEmpty()}
            hint="Num 1"
          />
          <MenuItem name="Fit" intent="zoom-to-fit" hint="Num 2" />
          <MenuItem name="Reset Zoom" intent="reset-zoom" hint="Num 3" />
        </MenuCategory>
        <MenuCategory category="Help" active={activeCategory === 'Help'}>
          <MenuItem name="About" intent="show-about" />
          <MenuItem name="Shortcut" intent="show-shortcut" />
        </MenuCategory>
      </div>
    ))

  return {
    DOM: vdom$,
    intent: intent$,
  }
}
