import { Action, SemanticTagConfig, State } from '../interfaces'

export default class ToggleSemanticTagAction extends Action {
  constructor(readonly tagConfig: SemanticTagConfig) {
    super()
  }

  next(state: State) {
    const item = state.sitem()
    const tagName = this.tagConfig.name
    const updatedItem = item.tags.has(tagName)
      ? // Remove tag
        item.update('tags', tags => tags.remove(tagName))
      : // Add tag and apply the styles
        item.update('tags', tags => tags.add(tagName)).merge(this.tagConfig.styles)
    return state.setIn(['items', item.id], updatedItem)
  }
}
