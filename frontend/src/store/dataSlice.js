import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../config.js';

const API_URL = API_BASE_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const fetchFacilities = createAsyncThunk('data/fetchFacilities', async (_, thunkAPI) => {
  try {
    const res = await fetch(`${API_URL}/facilities`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch facilities');
    // Map backend facility structure to frontend expected structure
    const mappedFacilities = data.facilities.map(f => ({
      id: f.id,
      label: f.name,
      icon: f.icon || 'building',
      capacity: String(f.capacity),
      available: f.isActive,
      category: f.category || 'academic', // Fallback to avoid undefined errors
      location: f.location,
      desc: f.description,
      image: f.images && f.images.length ? f.images[0] : null
    }));
    return mappedFacilities;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

const mapBooking = (b) => {
  return {
    id: b._id?.toString() || b.id,
    facility: b.facilityId?.name || 'Unknown Facility',
    facilityId: b.facilityId?.id || b.facilityId,
    purpose: b.purpose,
    status: b.status,
    date: b.date.split('T')[0],
    time: `${b.startTime} – ${b.endTime}`,
    attendees: b.attendeesCount,
    requirements: b.requirements,
    requester: b.userId?.name || 'Unknown User',
    requesterId: b.userId?._id || b.userId?.id || null,
    requesterRole: b.userId?.role || 'Unknown',
    pocName: b.pocName,
    pocContact: b.pocContact,
    cancelReason: b.notes,
    approvedByName: b.approval?.approvedById?.name || null,
    approvedByRole: b.approval?.approvedById?.role || null
  };
};

export const fetchBookings = createAsyncThunk('data/fetchBookings', async (_, thunkAPI) => {
  try {
    const res = await fetch(`${API_URL}/bookings`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch bookings');
    return data.bookings.map(mapBooking);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

export const fetchMyBookings = createAsyncThunk('data/fetchMyBookings', async (_, thunkAPI) => {
  try {
    const res = await fetch(`${API_URL}/bookings/my-bookings`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch my bookings');
    return data.bookings.map(mapBooking);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

export const createBooking = createAsyncThunk('data/createBooking', async (bookingData, thunkAPI) => {
  try {
    const res = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create booking');
    return mapBooking(data.booking);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});

export const updateBookingStatus = createAsyncThunk('data/updateBookingStatus', async ({ id, status, remarks }, thunkAPI) => {
  try {
    const res = await fetch(`${API_URL}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, notes: remarks })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update booking');
    return mapBooking(data.booking);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.message);
  }
});



const dataSlice = createSlice({
  name: 'data',
  initialState: {
    facilities: [],
    bookings: [], // admin: all, faculty: my
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacilities.pending, (state) => { state.loading = true; })
      .addCase(fetchFacilities.fulfilled, (state, action) => {
        state.loading = false;
        state.facilities = action.payload;
      })
      .addCase(fetchFacilities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBookings.pending, (state) => { state.loading = true; })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMyBookings.pending, (state) => { state.loading = true; })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.bookings.push(action.payload);
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => b.id === action.payload.id || b._id === action.payload.id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
      });
  }
});

export default dataSlice.reducer;
