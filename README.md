# Lys
Lys (risu) is an Flux statement manger for '21s React.

## Installation

```
yarn add @fleur/lys
```

## Slice

## VolatileSlice

`VolatileSlice` is per-page state managing region for client side.
It can be passing state and mutation procedure into child components.

VolatileSlice can not any action in server side. 

Example: 

```tsx
import { createVolatileSlice, useVolatileSliceRoot, useVolatileSlice } from '@fluer/lys'

type Form = {
  name: string | null
  items: Array<{ name: string }>
}

type Item = { name: string }

// Define VolatileSlice
// createVolatileSlice(actions, () => initialState)
const formVolatile = createVolatileSlice({
  setValue(draft, fields: Partial<Form>) {
    Object.assign(draft, fields)
  },
  setItemValue(draft, index: number, fields: Partial<Item>) {
    Object.assign(draft.items[index], fields)
  }
}, (): Form => ({
  name: null
  items: [{ name: '' }],
}))

const Component = () => {
  // Initialize volatile state with `useVolatileSliceRoot`
  const [state, actions] = useVolatileSliceRoot(formVolatile)

  const handleChangeName = useCallback(({currentTarget}: ChangeEvent<HTMLInputElement>) => {
      actions.setValue({ name: currentTarget.value })
  })

  return (
    <div>
      <label>Name: <input onChange={handleChangeName} /></label>
      {items.map((_, index) => <SubForm key={index} index={index} />)}
    </div>
  )
}

const SubForm = ({ index }: { index: number }) => {
  // Share `Component` inner volatile state and actions to `SubForm` by `useVolatileSlice`
  const [state, actions] = useVolatileSlice(formVolatile)
  const item = state.items[index]

  const handleChangeName = useCallback(({currentTarget}: ChangeEvent<HTMLInputElement>) => {
    // Mutation actions can be called by SubForm
    actions.setItemValue(index, { name: currentTarget.value })
  }, [index, actions])

  return (
    <div>
      <label>Item name: <input onChange={handleChangeName} value={item.name} /></label>
    </div>
  )
}

// In Application root
const App = () => {
  return (
    // `VolatileProvider` (or can use `LysProvider` instead)
    <VolatileProvider> 
      <Component />
    </VolatileProvider>
  )
}
```
