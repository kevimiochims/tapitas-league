'use client'

import { createContext, useContext, useState } from 'react'

const DrawerContext = createContext({})

export function DrawerProvider({ children }) {
  const [leftSlot, setLeftSlot] = useState(null)
  return (
    <DrawerContext.Provider value={{ leftSlot, setLeftSlot }}>
      {children}
    </DrawerContext.Provider>
  )
}

export function useDrawer() {
  return useContext(DrawerContext)
}