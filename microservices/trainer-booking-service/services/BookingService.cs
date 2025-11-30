using MongoDB.Driver;
using Microsoft.Extensions.Options;
using TrainerBookingService.Models;

namespace TrainerBookingService.Services
{
    public class BookingService
    {
        private readonly IMongoCollection<Booking> _bookings;

        public BookingService(IOptions<TrainerBookingDatabaseSettings> settings)
        {
            var dbSettings = settings.Value;

            var client = new MongoClient(dbSettings.ConnectionString);
            var database = client.GetDatabase(dbSettings.DatabaseName);

            _bookings = database.GetCollection<Booking>(dbSettings.BookingsCollectionName);
        }

        public List<Booking> GetAll() =>
            _bookings.Find(b => true).ToList();

        public Booking? Get(string id) =>
            _bookings.Find(b => b.Id == id).FirstOrDefault();

        public Booking Create(Booking booking)
        {
            var exists = _bookings.Find(b =>
                b.TrainerId == booking.TrainerId &&
                b.DateTime == booking.DateTime
            ).FirstOrDefault();

            if (exists != null)
                throw new Exception("Termin već rezerviran!");

            _bookings.InsertOne(booking);
            return booking;
        }

        public void Delete(string id) =>
            _bookings.DeleteOne(b => b.Id == id);
    }
}
