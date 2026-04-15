import { configureStore, createSlice } from "@reduxjs/toolkit";
import uiReducer from "@/store/slices/uiSlice";

const appSlice = createSlice({
  name: "app",
  initialState: { initialized: true },
  reducers: {},
});

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
