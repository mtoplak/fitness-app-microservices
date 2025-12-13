using MongoDB.Driver;
using Microsoft.Extensions.Options;
using TrainerBookingService.Models;

namespace TrainerBookingService.Services
{
    public class BookingService
    {
        private readonly IMongoCollection<Booking> _bookings;
        private readonly IMongoCollection<TrainerProfile> _trainers;

        public BookingService(IOptions<TrainerBookingDatabaseSettings> settings)
        {
            var dbSettings = settings.Value;
            var connectionString = Environment.GetEnvironmentVariable("MONGODB_URI") 
                ?? dbSettings.ConnectionString;
            var databaseName = Environment.GetEnvironmentVariable("DATABASE_NAME")
                ?? dbSettings.DatabaseName;

            var client = new MongoClient(connectionString);
            var database = client.GetDatabase(databaseName);

            _bookings = database.GetCollection<Booking>(dbSettings.BookingsCollectionName ?? "bookings");
            _trainers = database.GetCollection<TrainerProfile>(dbSettings.TrainersCollectionName ?? "trainers");
        }

        // Trainers
        public List<TrainerProfile> GetAllTrainers() =>
            _trainers.Find(t => t.IsActive).ToList();

        public TrainerProfile? GetTrainer(string id) =>
            _trainers.Find(t => t.Id == id || t.UserId == id).FirstOrDefault();

        public TrainerProfile? GetTrainerByUserId(string userId) =>
            _trainers.Find(t => t.UserId == userId).FirstOrDefault();

        public TrainerProfile CreateTrainer(TrainerProfile trainer)
        {
            trainer.CreatedAt = DateTime.UtcNow;
            _trainers.InsertOne(trainer);
            return trainer;
        }

        public void UpdateTrainer(string id, TrainerProfile trainer) =>
            _trainers.ReplaceOne(t => t.Id == id, trainer);

        // Bookings
        public List<Booking> GetAll() =>
            _bookings.Find(b => true).ToList();

        public Booking? Get(string id) =>
            _bookings.Find(b => b.Id == id).FirstOrDefault();

        public List<Booking> GetByUserId(string userId) =>
            _bookings.Find(b => b.UserId == userId).ToList();

        public List<Booking> GetByTrainerId(string trainerId) =>
            _bookings.Find(b => b.TrainerId == trainerId).ToList();

        public List<Booking> GetUpcoming(string userId) =>
            _bookings.Find(b => b.UserId == userId && b.StartTime > DateTime.UtcNow && b.Status == "confirmed")
                .SortBy(b => b.StartTime)
                .ToList();

        public Booking Create(Booking booking)
        {
            // Check for conflicts
            var conflictFilter = Builders<Booking>.Filter.And(
                Builders<Booking>.Filter.Eq(b => b.TrainerId, booking.TrainerId),
                Builders<Booking>.Filter.Lt(b => b.StartTime, booking.EndTime),
                Builders<Booking>.Filter.Gt(b => b.EndTime, booking.StartTime),
                Builders<Booking>.Filter.Eq(b => b.Status, "confirmed")
            );
            var conflict = _bookings.Find(conflictFilter).FirstOrDefault();
            if (conflict != null)
                throw new Exception("Termin že rezerviran!");

            // Get trainer name
            var trainer = GetTrainer(booking.TrainerId);
            if (trainer != null)
                booking.TrainerName = trainer.FullName;

            booking.CreatedAt = DateTime.UtcNow;
            booking.UpdatedAt = DateTime.UtcNow;
            _bookings.InsertOne(booking);
            return booking;
        }

        public Booking? Cancel(string id)
        {
            var booking = Get(id);
            if (booking == null) return null;

            booking.Status = "cancelled";
            booking.UpdatedAt = DateTime.UtcNow;
            _bookings.ReplaceOne(b => b.Id == id, booking);
            return booking;
        }

        public void Delete(string id) =>
            _bookings.DeleteOne(b => b.Id == id);
    }
}
