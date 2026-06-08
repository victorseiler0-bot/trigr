import { configureStore } from "@reduxjs/toolkit";
import notificationsReducer from "./slices/notificationsSlice";
import crmReducer from "./slices/crmSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      notifications: notificationsReducer,
      crm: crmReducer,
    },
  });

export type AppStore    = ReturnType<typeof makeStore>;
export type RootState   = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
