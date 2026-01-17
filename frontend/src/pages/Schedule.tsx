import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Users, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type WeeklyTimeSlot = {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
};

type GroupClass = {
  _id: string;
  name: string;
  schedule: WeeklyTimeSlot[];
  capacity?: number;
  trainerUserId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    fullName: string;
    email: string;
  };
};

const dayNames = ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
const dayNamesFullByGetDay = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(m: number): string {
  const hh = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// Get start of week (Monday) for a given date
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getDateForDayInWeek(weekStart: Date, dayOfWeek: number): Date {
  const date = new Date(weekStart);
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() + offset);
  return date;
}

function isDatePast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

function isDateToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === today.getTime();
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Schedule() {
  const [classes, setClasses] = useState<GroupClass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, 1 = next week, etc.
  const [selectedClass, setSelectedClass] = useState<{
    class: GroupClass;
    slot: WeeklyTimeSlot;
    date: Date;
  } | null>(null);
  const [availability, setAvailability] = useState<{
    capacity: number;
    booked: number;
    available: number;
    isFull: boolean;
  } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Calculate current week start
  const weekStart = useMemo(() => {
    const today = new Date();
    const start = getStartOfWeek(today);
    start.setDate(start.getDate() + (currentWeekOffset * 7));
    return start;
  }, [currentWeekOffset]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const canGoBack = currentWeekOffset > 0;
  const canGoForward = currentWeekOffset < 2; // Max 3 weeks (0, 1, 2)

  useEffect(() => {
    loadClasses();
  }, []);

  // Update current time every minute
  useEffect(() => {
    // Set initial time immediately
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const loadClasses = async () => {
    try {
      const data = await api.getClasses();
      setClasses(data as GroupClass[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Napaka pri nalaganju urnika");
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = async (groupClass: GroupClass, slot: WeeklyTimeSlot) => {
    if (!user) {
      toast({
        title: "Prijava potrebna",
        description: "Za rezervacijo vadbe se morate prijaviti.",
        variant: "destructive"
      });
      return;
    }

    if (user.role !== "member") {
      toast({
        title: "Samo za člane",
        description: "Samo člani lahko rezervirajo vadbe.",
        variant: "destructive"
      });
      return;
    }

    // Get the actual date for this class in the current week
    const classDate = getDateForDayInWeek(weekStart, slot.dayOfWeek);
    
    // Check if date is in the past
    if (isDatePast(classDate)) {
      toast({
        title: "Pretekla vadba",
        description: "Ne morete rezervirati vadbe v preteklosti.",
        variant: "destructive"
      });
      return;
    }

    setSelectedClass({ class: groupClass, slot, date: classDate });
    
    // Pridobi razpoložljivost za ta datum
    try {
      const dateStr = formatDateToYYYYMMDD(classDate);
      const avail = await api.getClassAvailability(groupClass._id, dateStr);
      setAvailability(avail);
    } catch (e) {
      console.error("Napaka pri preverjanju razpoložljivosti:", e);
      setAvailability(null);
    }
  };

  const handleBooking = async () => {
    if (!selectedClass || !user) return;

    setBookingLoading(true);
    
    try {
      const dateStr = formatDateToYYYYMMDD(selectedClass.date);
      await api.bookClass(selectedClass.class._id, dateStr);
      
      toast({
        title: "Uspešno rezervirano!",
        description: `Rezervirali ste vadbo ${selectedClass.class.name}.`,
      });
      
      setSelectedClass(null);
      setAvailability(null);
    } catch (e: unknown) {
      toast({
        title: "Napaka",
        description: e instanceof Error ? e.message : "Napaka pri rezervaciji",
        variant: "destructive"
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const timetable = useMemo(() => {
    const startOfDay = 6 * 60;
    const endOfDay = 22 * 60;
    const step = 30;
    const rows: number[] = [];
    for (let m = startOfDay; m <= endOfDay; m += step) rows.push(m);

    const byDay: Record<number, Array<{ className: string; start: number; end: number }>> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const c of classes) {
      for (const s of c.schedule || []) {
        byDay[s.dayOfWeek].push({ className: c.name, start: toMinutes(s.startTime), end: toMinutes(s.endTime) });
      }
    }
    for (let d = 0; d < 7; d++) {
      byDay[d].sort((a, b) => a.start - b.start);
    }
    return { rows, byDay };
  }, [classes]);

  return (
    <section className="bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto max-w-6xl py-16 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Urnik skupinskih vadb</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekOffset(offset => offset - 1)}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
              Prejšnji teden
            </Button>
            <div className="text-sm text-muted-foreground px-4">
              {weekStart.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekOffset(offset => offset + 1)}
              disabled={!canGoForward}
            >
              Naslednji teden
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {loading && <p className="text-muted-foreground">Nalagam...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background z-10 w-20 text-left text-sm font-medium text-muted-foreground py-2 pr-2">Čas</th>
                  {dayNames.map((d, i) => {
                    // dayNames array: [Pon=0, Tor=1, Sre=2, Čet=3, Pet=4, Sob=5, Ned=6]
                    // Need to convert to dayOfWeek enum: [Ned=0, Pon=1, Tor=2, Sre=3, Čet=4, Pet=5, Sob=6]
                    const dayOfWeek = i === 6 ? 0 : i + 1; // Convert: Pon(0)->1, Tor(1)->2, ..., Ned(6)->0
                    const dayDate = getDateForDayInWeek(weekStart, dayOfWeek);
                    const isPast = isDatePast(dayDate);
                    const isToday = isDateToday(dayDate);
                    
                    return (
                      <th key={i} className={`text-left text-sm font-medium py-2 px-2 ${isPast ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                        <div className="flex flex-col">
                          <span>{d}</span>
                          <span className="text-xs font-normal">{dayDate.getDate()}.{dayDate.getMonth() + 1}.</span>
                          {isToday && <span className="text-xs text-primary font-semibold">Danes</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timetable.rows.map((minute, rowIdx) => {
                  const label = minutesToLabel(minute);
                  // track covered cells for rowSpan
                  const row: (JSX.Element | null)[] = [];
                  row.push(
                    <td key={`time-${rowIdx}`} className="sticky left-0 bg-background z-10 align-top text-xs text-muted-foreground py-3 pr-2 border-t border-border">
                      {label}
                    </td>
                  );

                  for (let day = 0; day < 7; day++) {
                    // Convert display day index to dayOfWeek enum
                    // day 0=Pon, 1=Tor, ..., 6=Ned
                    // dayOfWeek: 0=Ned, 1=Pon, 2=Tor, ..., 6=Sob
                    const dayOfWeek = day === 6 ? 0 : day + 1;
                    const dayDate = getDateForDayInWeek(weekStart, dayOfWeek);
                    const isPastDay = isDatePast(dayDate);
                    const isTodayDay = isDateToday(dayDate);
                    
                    // Calculate current time position for today
                    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                    // Show timeline if current time falls within this 30-minute slot
                    const showTimeLine = isTodayDay && currentMinutes >= minute && currentMinutes < minute + 30;
                    // Calculate percentage for timeline position within the cell (0-100%)
                    const timeLineOffset = showTimeLine ? ((currentMinutes - minute) / 30) * 100 : 0;
                    
                    // find if a class starts now
                    const starting = timetable.byDay[dayOfWeek].find((c) => c.start === minute);
                    // find if this time is covered by a previous rowSpan of a class already rendered
                    const covering = timetable.byDay[dayOfWeek].find((c) => c.start < minute && c.end > minute);
                    if (starting) {
                      const duration = Math.max(1, Math.ceil((starting.end - starting.start) / 30));
                      const matchingClass = classes.find(c => c.name === starting.className);
                      const matchingSlot = matchingClass?.schedule.find(s => 
                        s.dayOfWeek === dayOfWeek && toMinutes(s.startTime) === starting.start
                      );
                      
                      // Check if this class has already ended today
                      const isClassPast = isTodayDay && starting.end <= currentMinutes;
                      
                      row.push(
                        <td
                          key={`d${day}-r${rowIdx}`}
                          rowSpan={duration}
                          className={`align-top border-t border-l first:border-l-0 border-border px-2 py-2 relative overflow-visible`}
                        >
                          {showTimeLine && (
                            <div 
                              className="absolute left-0 right-0 h-1 bg-red-500 z-50 pointer-events-none shadow-md"
                              style={{
                                top: `${timeLineOffset}%`,
                                transform: 'translateY(-50%)'
                              }}
                            >
                              <div className="absolute w-3 h-3 bg-red-500 rounded-full -ml-1.5 -left-1.5 top-1/2 -translate-y-1/2 shadow-sm" />
                            </div>
                          )}
                          <div 
                            onClick={() => !isPastDay && !isClassPast && matchingClass && matchingSlot && handleClassClick(matchingClass, matchingSlot)}
                            className={`rounded-md border border-border bg-card p-2 transition-colors ${
                              isPastDay || isClassPast
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-accent cursor-pointer'
                            }`}
                          >
                            <div className="text-xs text-muted-foreground">{minutesToLabel(starting.start)}–{minutesToLabel(starting.end)}</div>
                            <div className="text-sm font-semibold">{starting.className}</div>
                            {matchingClass?.capacity && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Kapaciteta: {matchingClass.capacity}
                              </div>
                            )}
                            {(isPastDay || isClassPast) && (
                              <div className="text-xs text-muted-foreground/70 mt-1">Preteklo</div>
                            )}
                          </div>
                        </td>
                      );
                    } else if (covering) {
                      // cell is covered by rowSpan above; skip
                      row.push(null);
                    } else {
                      row.push(
                        <td key={`d${day}-r${rowIdx}`} className={`border-t border-l first:border-l-0 border-border px-2 py-2 relative overflow-visible`}>
                          {showTimeLine && (
                            <div 
                              className="absolute left-0 right-0 h-1 bg-red-500 z-50 pointer-events-none shadow-md"
                              style={{
                                top: `${timeLineOffset}%`,
                                transform: 'translateY(-50%)'
                              }}
                            >
                              <div className="absolute w-3 h-3 bg-red-500 rounded-full -ml-1.5 -left-1.5 top-1/2 -translate-y-1/2 shadow-sm" />
                            </div>
                          )}
                        </td>
                      );
                    }
                  }
                  return <tr key={rowIdx}>{row}</tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog za rezervacijo */}
      <Dialog open={selectedClass !== null} onOpenChange={() => setSelectedClass(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rezervacija vadbe</DialogTitle>
            <DialogDescription>
              Potrdite rezervacijo skupinske vadbe
            </DialogDescription>
          </DialogHeader>
          
          {selectedClass && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedClass.class.name}</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {dayNamesFullByGetDay[selectedClass.date.getDay()]}, {selectedClass.date.toLocaleDateString('sl-SI')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Ura:</span>
                  <span>{selectedClass.slot.startTime} - {selectedClass.slot.endTime}</span>
                </div>
                {selectedClass.class.trainerUserId && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Trener: {selectedClass.class.trainerUserId.fullName}</span>
                  </div>
                )}
              </div>

              {availability && (
                <div className="border rounded-lg p-3 bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Razpoložljivost</span>
                    </div>
                    {availability.isFull ? (
                      <Badge variant="destructive">Polno</Badge>
                    ) : (
                      <Badge variant="default">Prosta mesta</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Kapaciteta</p>
                      <p className="font-medium">{availability.capacity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Zasedeno</p>
                      <p className="font-medium">{availability.booked}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Prosto</p>
                      <p className="font-medium">{availability.available}</p>
                    </div>
                  </div>
                </div>
              )}

              {availability?.isFull && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Žal ni več prostih mest za to vadbo.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedClass(null)} disabled={bookingLoading}>
              Prekliči
            </Button>
            <Button 
              onClick={handleBooking} 
              disabled={bookingLoading || availability?.isFull}
            >
              {bookingLoading ? "Rezerviram..." : "Potrdi rezervacijo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

