import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ActiveFilter =
  | "ALL"
  | "RESTROOM"
  | "CONCESSION"
  | "MERCH"
  | "EXIT"
  | "FIRST_AID";

type UIState = {
  activeFilter: ActiveFilter;
  selectedPoiId: string | null;
  searchTerm: string;
};

const initialState: UIState = {
  activeFilter: "ALL",
  selectedPoiId: null,
  searchTerm: "",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveFilter: (state, action: PayloadAction<ActiveFilter>) => {
      state.activeFilter = action.payload;
    },
    setSelectedPoiId: (state, action: PayloadAction<string | null>) => {
      state.selectedPoiId = action.payload;
    },
    clearSelectedPoiId: (state) => {
      state.selectedPoiId = null;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
  },
});

export const {
  setActiveFilter,
  setSelectedPoiId,
  clearSelectedPoiId,
  setSearchTerm,
} = uiSlice.actions;

export default uiSlice.reducer;
