namespace TrainerBookingService.Models;

public class DatabaseSettings
{
    public string ConnectionString { get; set; } = null!;
    public string DatabaseName { get; set; } = null!;
    public string TrainersCollectionName { get; set; } = "trainers";
    public string BookingsCollectionName { get; set; } = "bookings";
}

public class TrainerBookingDatabaseSettings : DatabaseSettings {}
