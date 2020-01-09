import React, { useCallback, useEffect, useState } from 'react'
import { Observable } from 'rxjs'
import createDatabase from './database'
import printWelcomeMessage from './welcomeMessage'

const stubbedFn = key => ([...args]) => {
  console.log(
    // eslint-disable-line no-console
    '%cYou are using a stubbed version of AragonApi!',
    `color: rgb(0, 203, 230); font-size: 18px`
  )
  console.log(
    // eslint-disable-line no-console
    `  api.%c${key}`,
    `color: rgb(251, 121, 121)`,
    'is not yet supported'
  )
  return new Observable(subscriber => {
    subscriber.next(`STUBBED-${key}(${args && JSON.stringify(args)})`)
    subscriber.complete()
  })
}

const buildHook = ({ initialState, functions }) => {
  const db = createDatabase({ initialState })
  const guiDb = createDatabase({ appearance: 'dark' })

  printWelcomeMessage(Object.keys(functions({}, () => {})))

  const useStubbedAragonApi = () => {
    const [appState, setAppState] = useState(db.fetchData())
    const [guiStyle, setGuiStyle] = useState(guiDb.fetchData())
    const onDatabaseUpdate = useCallback(e => {
      setAppState(e.detail)
    }, [])

    const onGuiDbUpdate = useCallback(e => {
      setGuiStyle(e.detail)
    }, [])

    useEffect(() => {
      db.subscribe(onDatabaseUpdate)
      guiDb.subscribe(onGuiDbUpdate)
      return () => {
        db.unsubscribe(onDatabaseUpdate)
        guiDb.unsubscribe(onGuiDbUpdate)
      }
    }, [])

    const apiOverride = {
      cache: (key, value) => {
        const newState = {
          ...appState,
          [key]: value,
        }
        db.setData(newState)
        return value
      },
      getCache: key => {
        return appState[key]
      },
      resolveAddressIdentity: address =>
        new Observable(subscriber => {
          subscriber.next(`STUBBED-${address}`)
          subscriber.complete()
        }),
      ...functions(appState, db.setData),
      setTheme: theme => db.setData({ appearance: theme }),
    }

    const apiProxy = new Proxy(apiOverride, {
      get: (target, key) => (key in target ? target[key] : stubbedFn(key)),
      has: () => true,
    })

    window.api = apiProxy

    return {
      api: apiProxy,
      appState,
      guiStyle,
      connectedAccount: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
    }
  }

  return useStubbedAragonApi
}

module.exports = buildHook
