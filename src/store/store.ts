import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    // We will add slices here later (e.g., map: mapReducer)
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
