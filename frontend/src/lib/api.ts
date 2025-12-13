export type ApiConfig = {
  baseUrl: string;
};

// Kong Gateway URL - all microservices are accessed through Kong
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });
  if (!res.ok) {
    const message = (await res.json().catch(() => null))?.message || res.statusText;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

// Helper to get user ID from token
function getUserIdFromToken(): string | null {
  const token = localStorage.getItem("auth_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.userId || payload.id || null;
  } catch {
    return null;
  }
}

export const api = {
  // ========== USER SERVICE (user-service:3001) ==========
  register: (data: { email: string; password: string; firstName: string; lastName: string; address?: string; role?: "admin" | "trainer" | "member" }) =>
    request<{ token: string; user: { id: string; email: string; firstName?: string; lastName?: string; fullName: string; address?: string; role: string } }>(
      "/users/register",
      {
        method: "POST",
        body: JSON.stringify({ ...data, fullName: `${data.firstName} ${data.lastName}` })
      }
    ),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; email: string; firstName?: string; lastName?: string; fullName: string; address?: string; role: string } }>("/users/login", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  me: () => request<{ id: string; email: string; firstName?: string; lastName?: string; fullName: string; address?: string; role: string }>("/users/me"),
  
  // Profile endpoints - uses user-service + subscription-service
  getProfile: async () => {
    const user = await request<{ id: string; email: string; firstName?: string; lastName?: string; fullName: string; address?: string; role: string; membershipId?: string }>("/users/me");
    let membership = null;
    if (user.id) {
      try {
        const sub = await request<{ id: string; planName: string; status: string; startDate: string; endDate: string } | null>(`/subscriptions/user/${user.id}`);
        if (sub) {
          membership = {
            package: sub.planName,
            price: 0,
            startDate: sub.startDate,
            endDate: sub.endDate,
            isActive: sub.status === "active"
          };
        }
      } catch {
        // No subscription
      }
    }
    return { user, membership };
  },
  
  // Bookings - combines trainer-booking-service and group-class-booking-service
  getBookings: async (params?: { status?: string; upcoming?: boolean }) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Not authenticated");
    
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    
    // Fetch from both services
    const [trainerBookings, classBookings] = await Promise.all([
      request<Array<{ id: string; trainerId: string; trainerName?: string; startTime: string; endTime: string; status: string; notes?: string; createdAt: string }>>(`/trainer-bookings/user/${userId}${params?.status ? `?status=${params.status}` : ""}`).catch(() => []),
      request<Array<{ id: string; classId: string; className?: string; status: string; bookedAt: string }>>(`/bookings?userId=${userId}`).catch(() => [])
    ]);
    
    const bookings = [
      ...trainerBookings.map(b => ({
        id: b.id,
        type: "personal_training" as const,
        status: b.status as "confirmed" | "cancelled" | "completed",
        notes: b.notes,
        createdAt: b.createdAt,
        trainer: { id: b.trainerId, name: b.trainerName || "", email: "" },
        startTime: b.startTime,
        endTime: b.endTime
      })),
      ...classBookings.map(b => ({
        id: b.id,
        type: "group_class" as const,
        status: b.status as "confirmed" | "cancelled" | "completed",
        createdAt: b.bookedAt,
        className: b.className,
        classDate: b.bookedAt
      }))
    ];
    
    return { bookings };
  },
  
  getBookingDetails: async (id: string) => {
    // Try trainer booking first, then class booking
    try {
      const booking = await request<{ id: string; trainerId: string; trainerName?: string; startTime: string; endTime: string; status: string; notes?: string; createdAt: string; updatedAt?: string }>(`/trainer-bookings/${id}`);
      return {
        id: booking.id,
        type: "personal_training" as const,
        status: booking.status as "confirmed" | "cancelled" | "completed",
        notes: booking.notes,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt || booking.createdAt,
        trainer: { id: booking.trainerId, name: booking.trainerName || "", email: "" },
        startTime: booking.startTime,
        endTime: booking.endTime
      };
    } catch {
      // Try class booking
      const booking = await request<{ id: string; classId: string; className?: string; status: string; bookedAt: string }>(`/bookings/${id}`);
      return {
        id: booking.id,
        type: "group_class" as const,
        status: booking.status as "confirmed" | "cancelled" | "completed",
        createdAt: booking.bookedAt,
        updatedAt: booking.bookedAt,
        classDate: booking.bookedAt,
        className: booking.className
      };
    }
  },

  cancelBooking: async (id: string) => {
    // Try trainer booking first
    try {
      await request<{ message: string }>(`/trainer-bookings/${id}`, { method: "DELETE" });
      return { message: "Booking cancelled", bookingId: id };
    } catch {
      // Try class booking
      await request<{ message: string }>(`/bookings/${id}`, { method: "DELETE" });
      return { message: "Booking cancelled", bookingId: id };
    }
  },

  // ========== GROUP CLASS BOOKING SERVICE (group-class-booking-service:3005) ==========
  getClasses: async () => {
    const classes = await request<Array<{
      id: string;
      _id?: string;
      name: string;
      description?: string;
      scheduledAt: string;
      duration: number;
      capacity?: number;
      currentParticipants?: number;
      trainerId?: string;
      trainerName?: string;
      status?: string;
    }>>("/classes");
    
    // Transform each class instance to the format expected by Schedule.tsx
    // Each class instance becomes a class with a single schedule slot
    return classes.map(c => {
      const date = new Date(c.scheduledAt);
      const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const startTime = `${hours}:${minutes}`;
      const endMinutes = date.getMinutes() + (c.duration || 60);
      const endHours = date.getHours() + Math.floor(endMinutes / 60);
      const endTime = `${endHours.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      
      // Extract trainer name from description (format: "Class Name with Trainer Name")
      const trainerName = c.description?.includes(' with ') 
        ? c.description.split(' with ')[1] 
        : c.trainerName || 'Trener';
      
      return {
        _id: c.id || c._id || '',
        name: c.name,
        description: c.description,
        capacity: c.capacity,
        currentParticipants: c.currentParticipants,
        trainerId: c.trainerId,
        trainerUserId: c.trainerId ? { 
          _id: c.trainerId, 
          fullName: trainerName,
          firstName: trainerName.split(' ')[0],
          lastName: trainerName.split(' ').slice(1).join(' '),
          email: '' 
        } : undefined,
        schedule: [{ dayOfWeek, startTime, endTime }],
        // Store the actual date for week filtering
        scheduledAt: c.scheduledAt
      };
    });
  },

  getClass: async (id: string) => {
    const c = await request<{
      id: string;
      _id?: string;
      name: string;
      description?: string;
      scheduledAt: string;
      duration: number;
      capacity?: number;
      currentParticipants?: number;
      trainerId?: string;
      trainerName?: string;
      status?: string;
    }>(`/classes/${id}`);
    
    const date = new Date(c.scheduledAt);
    const dayOfWeek = date.getDay();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const startTime = `${hours}:${minutes}`;
    const endMinutes = date.getMinutes() + (c.duration || 60);
    const endHours = date.getHours() + Math.floor(endMinutes / 60);
    const endTime = `${endHours.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
    
    return {
      _id: c.id || c._id || '',
      name: c.name,
      description: c.description,
      capacity: c.capacity,
      trainerId: c.trainerId,
      trainerUserId: c.trainerId ? { _id: c.trainerId, fullName: c.trainerName || 'Trener', email: '' } : undefined,
      schedule: [{ dayOfWeek, startTime, endTime }]
    };
  },

  getClassAvailability: (id: string, _date?: string) => request<{
    available: boolean;
    capacity: number;
    currentParticipants: number;
    remainingSpots: number;
  }>(`/classes/${id}/availability`).then(data => ({
    capacity: data.capacity,
    booked: data.currentParticipants,
    available: data.remainingSpots,
    isFull: !data.available
  })),

  bookClass: (classId: string, _classDate?: string) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Not authenticated");
    return request<{ id: string; userId: string; classId: string; status: string; bookedAt: string }>("/bookings", {
      method: "POST",
      body: JSON.stringify({ userId, classId })
    }).then(data => ({
      message: "Booking created",
      booking: {
        id: data.id,
        classDate: data.bookedAt,
        status: data.status
      }
    }));
  },

  // ========== SUBSCRIPTION SERVICE (subscription-service:3002) ==========
  getMembershipPackages: () => request<Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    accessLevel?: number;
    features?: string[];
    isActive: boolean;
  }>>("/plans?activeOnly=true").then(packages => ({
    packages: packages.map(p => ({ _id: p.id, name: p.name, price: p.price }))
  })),

  getCurrentMembership: async () => {
    const userId = getUserIdFromToken();
    if (!userId) return { membership: null };
    try {
      const sub = await request<{
        id: string;
        planId: string;
        planName: string;
        status: string;
        startDate: string;
        endDate: string;
        autoRenew: boolean;
      } | null>(`/subscriptions/user/${userId}`);
      if (!sub) return { membership: null };
      return {
        membership: {
          id: sub.id,
          package: {
            id: sub.planId,
            name: sub.planName,
            price: 0
          },
          startDate: sub.startDate,
          endDate: sub.endDate,
          autoRenew: sub.autoRenew,
          status: sub.status as "active" | "cancelled" | "expired"
        }
      };
    } catch {
      return { membership: null };
    }
  },

  getMembershipHistory: async () => {
    const userId = getUserIdFromToken();
    if (!userId) return { memberships: [] };
    const subs = await request<Array<{
      id: string;
      planId: string;
      planName: string;
      status: string;
      startDate: string;
      endDate: string;
      autoRenew: boolean;
      cancelledAt?: string;
      createdAt: string;
    }>>(`/subscriptions/user/${userId}/all`);
    return {
      memberships: subs.map(s => ({
        id: s.id,
        package: { id: s.planId, name: s.planName, price: 0 },
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        autoRenew: s.autoRenew,
        cancelledAt: s.cancelledAt,
        createdAt: s.createdAt
      }))
    };
  },

  getPayments: async () => {
    const userId = getUserIdFromToken();
    if (!userId) return { payments: [] };
    const payments = await request<Array<{
      id: string;
      amount: number;
      status: string;
      paymentMethod?: string;
      paymentDate?: string;
      transactionId?: string;
    }>>(`/payments/user/${userId}`);
    return {
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        description: `Payment ${p.transactionId || p.id}`,
        createdAt: p.paymentDate || new Date().toISOString()
      }))
    };
  },

  subscribeToPlan: (planId: string) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Not authenticated");
    return request<{ id: string; userId: string; planId: string; status: string }>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({ userId, planId, paymentMethod: "credit_card" })
    }).then(data => ({
      message: "Subscription created",
      membershipId: data.id
    }));
  },

  changeMembershipPackage: async (packageId: string) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Not authenticated");
    // Cancel current and create new
    const current = await request<{ id: string } | null>(`/subscriptions/user/${userId}`);
    if (current?.id) {
      await request(`/subscriptions/${current.id}/cancel`, { method: "POST", body: JSON.stringify({ reason: "Package change" }) });
    }
    const newSub = await request<{ id: string; endDate: string }>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({ userId, planId: packageId, paymentMethod: "credit_card" })
    });
    return { message: "Package changed", effectiveDate: newSub.endDate };
  },

  cancelMembership: async () => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Not authenticated");
    const sub = await request<{ id: string; endDate: string } | null>(`/subscriptions/user/${userId}`);
    if (!sub) throw new Error("No active subscription");
    await request(`/subscriptions/${sub.id}/cancel`, { method: "POST", body: JSON.stringify({ reason: "User cancelled" }) });
    return { message: "Subscription cancelled", endDate: sub.endDate };
  },

  reactivateMembership: async () => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Not authenticated");
    const subs = await request<Array<{ id: string; status: string }>>(`/subscriptions/user/${userId}/all`);
    const cancelled = subs.find(s => s.status === "cancelled");
    if (!cancelled) throw new Error("No cancelled subscription to reactivate");
    await request(`/subscriptions/${cancelled.id}/reactivate`, { method: "POST" });
    return { message: "Subscription reactivated" };
  },

  // Class participants - group-class-booking-service
  getClassParticipants: (classId: string, _date?: string) => request<Array<{
    userId: string;
    bookedAt: string;
    status: string;
  }>>(`/classes/${classId}/participants`).then(participants => ({
    className: "",
    classDate: "",
    capacity: 0,
    totalParticipants: participants.length,
    availableSpots: 0,
    participants: participants.map(p => ({
      id: p.userId,
      user: { id: p.userId, fullName: "", email: "" },
      bookedAt: p.bookedAt
    }))
  })),

  // ========== TRAINER BOOKING SERVICE (trainer-booking-service:3003) ==========
  getTrainers: () => request<Array<{
    id: string;
    userId?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    hourlyRate: number;
    specialty?: string;
    isActive: boolean;
  }>>("/trainers?activeOnly=true").then(trainers => trainers.map(t => ({
    id: t.id,
    firstName: t.firstName,
    lastName: t.lastName,
    fullName: t.fullName || `${t.firstName || ""} ${t.lastName || ""}`.trim(),
    email: t.email || "",
    hourlyRate: t.hourlyRate,
    trainerType: "both" as const
  }))),

  getTrainerAvailability: (trainerId: string, date: string) => {
    const fromDate = new Date(date);
    const toDate = new Date(date);
    toDate.setDate(toDate.getDate() + 1);
    return request<Array<{
      date: string;
      startTime: string;
      endTime: string;
      isBooked: boolean;
    }>>(`/trainers/${trainerId}/availability?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`).then(slots => ({
      trainerId,
      trainerName: "",
      date,
      hourlyRate: 0,
      slots: slots.map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
        available: !s.isBooked,
        displayTime: `${s.startTime} - ${s.endTime}`
      }))
    }));
  },

  bookPersonalTraining: (trainerId: string, data: { startTime: string; endTime: string; notes?: string }) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Not authenticated");
    return request<{ id: string; trainerId: string; startTime: string; endTime: string; status: string }>("/trainer-bookings", {
      method: "POST",
      body: JSON.stringify({ userId, trainerId, ...data })
    }).then(booking => ({
      message: "Booking created",
      booking: {
        id: booking.id,
        trainerId: booking.trainerId,
        trainerName: "",
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        hourlyRate: 0
      }
    }));
  },

  getMyTrainerBookings: (upcoming?: boolean) => {
    const userId = getUserIdFromToken();
    if (!userId) return Promise.resolve({ bookings: [] });
    const params = upcoming ? "?upcoming=true" : "";
    return request<Array<{
      id: string;
      trainerId: string;
      userId: string;
      startTime: string;
      endTime: string;
      notes?: string;
      status: string;
      createdAt: string;
    }>>(`/trainer-bookings/trainer/${userId}${params}`).then(bookings => ({
      bookings: bookings.map(b => ({
        id: b.id,
        client: { id: b.userId, fullName: "", email: "" },
        startTime: b.startTime,
        endTime: b.endTime,
        notes: b.notes || "",
        status: b.status,
        createdAt: b.createdAt
      }))
    }));
  },

  // ========== CLASS MANAGEMENT (group-class-booking-service:3005) ==========
  getMyClasses: async () => {
    const userId = getUserIdFromToken();
    if (!userId) return { classes: [] };
    const classes = await request<Array<{
      _id: string;
      name: string;
      description?: string;
      difficulty?: "easy" | "medium" | "hard";
      duration?: number;
      capacity?: number;
      schedule: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
      trainerId?: string;
      createdAt?: string;
      updatedAt?: string;
    }>>("/classes");
    // Filter classes by trainer
    return { classes: classes.filter(c => c.trainerId === userId) };
  },

  createClass: (data: {
    name: string;
    description?: string;
    difficulty?: "easy" | "medium" | "hard";
    duration?: number;
    capacity?: number;
    schedule: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  }) => {
    const userId = getUserIdFromToken();
    return request<{ _id: string; name: string; description?: string }>("/classes", {
      method: "POST",
      body: JSON.stringify({ ...data, trainerId: userId })
    }).then(cls => ({
      message: "Class created",
      class: cls
    }));
  },

  updateClass: (id: string, data: {
    name?: string;
    description?: string;
    difficulty?: "easy" | "medium" | "hard";
    duration?: number;
    capacity?: number;
    schedule?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  }) => request<{ _id: string; name: string }>(`/classes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  }).then(cls => ({
    message: "Class updated",
    class: cls
  })),

  deleteClass: (id: string) => request<{ message: string }>(`/classes/${id}`, {
    method: "DELETE"
  }),

  // ========== WORKOUT SCHEDULE SERVICE (workout-schedule-service:3004) ==========
  getSchedules: (params?: { trainerId?: string; from?: string; to?: string; type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.trainerId) queryParams.append("trainerId", params.trainerId);
    if (params?.from) queryParams.append("from", params.from);
    if (params?.to) queryParams.append("to", params.to);
    if (params?.type) queryParams.append("type", params.type);
    const query = queryParams.toString();
    return request<Array<{
      id: string;
      trainerId: string;
      scheduledAt: string;
      duration: number;
      type: string;
      status: string;
    }>>(`/schedules${query ? `?${query}` : ""}`);
  },

  proposeSchedule: (data: { trainerId: string; scheduledAt: string; duration: number; type: string }) =>
    request<{ id: string; status: string }>("/schedules/propose", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // ========== ADMIN REPORTING SERVICE (admin-reporting-service:3006) ==========
  getDashboardStats: () => request<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    classAttendance: number;
  }>("/dashboard"),

  getRevenueStats: (period: "daily" | "monthly" | "yearly" = "monthly") =>
    request<{ period: string; data: Array<{ date: string; amount: number }> }>(`/stats/revenue?period=${period}`),

  getAttendanceStats: () => request<{ total: number; byClass: Array<{ classId: string; count: number }> }>("/stats/attendance"),

  getReports: () => request<Array<{ id: string; type: string; createdAt: string }>>("/reports"),

  createReport: (data: { type: string; filters?: Record<string, unknown> }) =>
    request<{ id: string; type: string }>("/reports", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // Admin endpoints - generic GET for flexible usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: (path: string) => request<any>(path),
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: (path: string, data?: any) => request<any>(path, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined
  }),
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: (path: string, data?: any) => request<any>(path, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined
  }),
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: (path: string) => request<any>(path, {
    method: "DELETE"
  }),
};

