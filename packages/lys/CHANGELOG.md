## 2.0.1

- Fix README

## 2.0.0

- Breaking: `createSlice` interface was changed
  ```ts
  // After 2.0.0
  createSlice({
    actions: {
      someAction: (...) => { ... },
    },
    computed: {
      ok: state => state.***,
    }
  }, () => ({ /* initial state */}))

  // Before 2.0.0
  createSlice({
    someAction: (...) => { ... },
  }, () => ({ /* initial state */}))
  ```
- [#3](https://github.com/fleur-js/lys/pull/3) Introduce `computed` property
- [#4](https://github.com/fleur-js/lys/pull/4) Add `mockSlice` function for testing

## 1.0.3

- [#2](https://github.com/fleur-js/lys/pull/2) Fix slice instance will remaining after root component unmount
- [#2](https://github.com/fleur-js/lys/pull/2) Remove unused peer dependency (react-dom)

## 0.1.2

- Add comment for builtin action `set` and `reset`
- Fix action not returning Promise

## 0.1.0

First release
