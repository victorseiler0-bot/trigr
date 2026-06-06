import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface NotificationsState {
  waUnreadCount: number;
  emailUnreadCount: number;
  briefReady: boolean;
}

const initialState: NotificationsState = {
  waUnreadCount: 0,
  emailUnreadCount: 0,
  briefReady: false,
};

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setWaUnread:    (s, a: PayloadAction<number>) => { s.waUnreadCount    = a.payload; },
    setEmailUnread: (s, a: PayloadAction<number>) => { s.emailUnreadCount = a.payload; },
    setBriefReady:  (s, a: PayloadAction<boolean>) => { s.briefReady      = a.payload; },
    clearAll: (s) => { s.waUnreadCount = 0; s.emailUnreadCount = 0; s.briefReady = false; },
  },
});

export const { setWaUnread, setEmailUnread, setBriefReady, clearAll } = notificationsSlice.actions;
export default notificationsSlice.reducer;
