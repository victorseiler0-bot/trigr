import { configureStore } from "@reduxjs/toolkit";
import notificationsReducer from "./slices/notificationsSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      notifications: notificationsReducer,
    },
  });

export type AppStore    = ReturnType<typeof makeStore>;
export type RootState   = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
