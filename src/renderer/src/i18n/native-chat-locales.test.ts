import { describe, expect, it } from 'vitest'
import en from './locales/en.json'
import es from './locales/es.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import zh from './locales/zh.json'

const localizedCatalogs = { es, ja, ko, zh }
const englishComposer = en.auto.components['native-chat'].composer

describe('native chat locale copy', () => {
  it.each(Object.entries(localizedCatalogs))(
    '%s keeps provider-neutral copy localized',
    (_code, catalog) => {
      const composer = catalog.auto.components['native-chat'].composer
      for (const key of [
        'model',
        'effort',
        'fastMode',
        'thinking',
        'options',
        'sessionOptions',
        'chooseInAgentPicker',
        'toggleOption',
        'valueUnknown',
        'sentNotConfirmed'
      ] as const) {
        expect(composer[key].trim()).not.toBe('')
        expect(composer[key]).not.toBe(englishComposer[key])
      }
      for (const key of ['fast', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const) {
        expect(composer.optionValue[key].trim()).not.toBe('')
        expect(composer.optionValue[key]).not.toBe(englishComposer.optionValue[key])
      }
      // Why: On/Off loanwords are valid translations; only require non-empty.
      for (const key of ['on', 'off'] as const) {
        expect(composer.optionValue[key].trim()).not.toBe('')
      }
    }
  )
})
