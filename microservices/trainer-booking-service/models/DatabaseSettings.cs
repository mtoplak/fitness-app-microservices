namespace TrainerBookingService.Models;

public class DatabaseSettings
{
    public string ConnectionString { get; set; }
    public string DatabaseName { get; set; }
    public string TrainersCollectionName { get; set; }
    public string BookingsCollectionName { get; set; }
}

public class TrainerBookingDatabaseSettings : DatabaseSettings {}
