import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../config.js';

const API_URL = API_BASE_URL;

// Async thunks
export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, thunkAPI) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    
    // Save token
    localStorage.setItem('token', data.token);
    return data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, thunkAPI) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token');
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch user');
    return data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async ({ currentPassword, newPassword }, thunkAPI) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Password change failed');
    return data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
    firstLogin: false
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      state.firstLogin = false;
      localStorage.removeItem('token');
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setFirstLoginComplete: (state) => {
      state.firstLogin = false;
      if (state.user) {
        state.user.firstLogin = false;
        state.user.first_login = false;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.firstLogin = action.payload.user?.firstLogin || action.payload.user?.first_login || false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.firstLogin = action.payload.user?.firstLogin || action.payload.user?.first_login || false;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.firstLogin = false;
        localStorage.removeItem('token');
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.firstLogin = false;
        if (state.user) {
          state.user.firstLogin = false;
          state.user.first_login = false;
        }
      });
  }
});

export const { logout, clearAuthError, setFirstLoginComplete } = authSlice.actions;
export default authSlice.reducer;
