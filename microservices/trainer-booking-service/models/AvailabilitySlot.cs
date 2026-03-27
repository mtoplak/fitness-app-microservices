namespace TrainerBookingService.Models
{
    public class AvailabilitySlot
    {
        public string Date { get; set; } = null!;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public bool IsBooked { get; set; }
    }
}
