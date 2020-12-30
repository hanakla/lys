# Lys
Lys (risu) is an minimal statement manger for '21s React.

It's focus to **Per page state management**, not application global state management.  
Lys is usable to instead of `useReducer`, `Mobx`, or `Recoil` if you have async procedure.

See [CodeSandbox Example](https://codesandbox.io/s/fleur-lys-official-example-ok533?file=/src/App.js)

```
yarn add @fleur/lys
```

- [Features](#features)
- [Usage](#usage)
- [Testing](#testing)

## Features

- Per page level micro state management
- Initial state via external data
  - Can be use with likes `Next.js`, `useSWR`
- Testing friendly
- Type safe
- Minimal re-rendering



## Usage

Summary in [CodeSandbox Example](https://codesandbox.io/s/fleur-lys-official-example-ok533?file=/src/App.js).

First, define your slice.

```tsx
import { createSlice } from '@fleur/lys'

const formSlice = createSlice({
  // Define actions
  async patchItem({ draft }, index: number, patch: Partial<FormState['items'][0]>) {
    Object.assign(draft.form.items[index], patch)
  },
  async submit({ draft, updateTemporary }) {
    if (draft.hasError) return

    // Update the state visible from Component.
    // It's not effected to current `draft`.
    // On after complete this action, reset to action result draft.
    updateTemporary({ submitting: true })

    draft.form = await (
      await fetch('/api/users', { method: 'POST', body: JSON.stringify(draft.form) })
    ).json()
  },
  async validate({ draft }) {
    const { form } = draft
    draft.hasError = false

    // Use your favorite validator
    draft.hasError = await validateForm(form)
  },
}, (): FormState => ({
  // Define initial state
  submitting: false,
  hasError: false,
  form: {
    id: null,
    username: '',
    items: [{ name: '' }]
  }
}))
```

Next, initialize slice on your page component

```tsx
import { useLysSliceRoot, useLysSlice } from '@fleur/lys'

export const NewUserPage = () => {
  const { data: initialData, error } = useSWR('/users/1', fetcher)

  // Initialize slice by `useLysSliceRoot`
  // `initialState` in second argument, it shallow override to Slice's initial state.
  // `initialData` is re-evaluated when it changes from null or undefined to something else.
  //
  // Or can you define `fetchUser` in slice and call it in `useEffect()`
  const [state, actions] = useLysSliceRoot(formSlice, initialData ? { form: initialData } : null)

  const handleChangeName = useCallback(({ currentTarget }) => {
    // `set` is builtin action
    actions.set(({ form }) => { form.username = currentTarget.value })
  },[])

  const handleSubmit = useCallback(async () => {
    await actions.validate()
    await actions.submit()
  }, [])
  
  return (
    <div>
      <label>
        Display name: <input type="text" value={state.form.name} onChange={handleChangeName} />
      </label>

      <h1>Your items</h1>
      {state.form.items.map((index) => <Item index={index} />)}

      <button disabled={state.submitting} onClick={handleSubmit}>Register</button>
    </div>
  )
}

// In child component
const Item = ({ index }) => {
  // Use slice from page root by `useLysSlice`
  const [state, actions] = useLysSlice(formSlice)
  const item = state.form.items[index]!

  const handleChangeName = useCallback(({ currentTarget }) => {
    // Can call action from child component and share state with root.
    // Re-rendering from root (no duplicate re-rendering)
    actions.patchItem(index, { name: currentTarget.value })
  }, [])

  return (
    <div>
      Item of #{index + 1}
      <label>Name: <input type="text" value={item.name} /></label>
    </div>
  )
}
```

## Testing

Lys's Slice is very testable.
Let look testing example!

```tsx
import { instantiateSlice, createSlice } from '@fleur/lys'

// Define
const slice = createSlice({
  increment({ draft }) {
    draft.count++
  }
}, () => ({ count: 0 }))

describe('Testing slice', () => {
  it('Should increment one', async () => {
    // instantiate
    const { state, actions } = instantiateSlice(slice)
    
    // Expection
    expect(state.current.count).toBe(0)
    await actions.increment()
    expect(state.current.count).toBe(1)
  })
})
```
