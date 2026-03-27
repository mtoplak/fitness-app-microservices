using MongoDB.Driver;
using MongoDB.Bson;
using TrainerBookingService.Models;

namespace TrainerBookingService.Scripts
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("🌱 Seeding Trainer Booking Service...");
            
            var mongoUri = Environment.GetEnvironmentVariable("MONGODB_URI") 
                ?? "mongodb://admin:admin123@mongo-trainer-bookings:27017/fitness_trainer_bookings?authSource=admin";
            
            var client = new MongoClient(mongoUri);
            var database = client.GetDatabase("fitness_trainer_bookings");
            
            // Clear existing data
            await database.DropCollectionAsync("trainerprofiles");
            await database.DropCollectionAsync("bookings");
            
            var trainersCollection = database.GetCollection<TrainerProfile>("trainerprofiles");
            var bookingsCollection = database.GetCollection<Booking>("bookings");
            
            // Create trainers (matching the user-service seed data)
            var specializations = new[] { "Strength Training", "Cardio", "Yoga", "Pilates", "CrossFit", "Boxing", "Nutrition" };
            var trainerSeed = new[]
            {
                new { Id = "696d030d92e2df6f97219a86", Name = "Ana Kovač", Email = "ana.kovac@wiifit.si" },
                new { Id = "696d030d92e2df6f97219a88", Name = "Marko Novak", Email = "marko.novak@wiifit.si" },
                new { Id = "696d030d92e2df6f97219a8a", Name = "Luka Horvat", Email = "luka.horvat@wiifit.si" },
                new { Id = "696d030d92e2df6f97219a8c", Name = "Sara Petek", Email = "sara.petek@wiifit.si" },
                new { Id = "696d030d92e2df6f97219a8e", Name = "Tomaž Zupan", Email = "tomaz.zupan@wiifit.si" },
                new { Id = "696d030d92e2df6f97219a90", Name = "Maja Žnidaršič", Email = "maja.znidarsic@wiifit.si" },
                new { Id = "696d030d92e2df6f97219a92", Name = "Rok Breznik", Email = "rok.breznik@wiifit.si" }
            };
            
            var trainers = new List<TrainerProfile>();
            for (int i = 0; i < trainerSeed.Length; i++)
            {
                var seed = trainerSeed[i];
                var trainer = new TrainerProfile
                {
                    UserId = seed.Id,
                    FullName = seed.Name,
                    Email = seed.Email,
                    TrainerType = i % 2 == 0 ? "personal" : "group",
                    Specializations = new List<string> 
                    { 
                        specializations[i % specializations.Length],
                        specializations[(i + 1) % specializations.Length]
                    },
                    Bio = $"Experienced trainer specializing in {specializations[i % specializations.Length]} with {3 + (i * 2)} years of experience.",
                    HourlyRate = 50 + (i * 10),
                    IsActive = true
                };
                trainers.Add(trainer);
            }
            
            await trainersCollection.InsertManyAsync(trainers);
            Console.WriteLine($"✅ Created {trainers.Count} trainers");
            
            // Create some sample bookings
            var sampleUserIds = new[]
            {
                "696d030d92e2df6f97219a94",
                "696d030d92e2df6f97219a96",
                "696d030d92e2df6f97219a98"
            };
            
            var bookings = new List<Booking>();
            var statuses = new[] { "confirmed", "completed", "cancelled" };
            
            for (int i = 0; i < 15; i++)
            {
                var trainerIndex = i % trainers.Count;
                var trainer = trainers[trainerIndex];
                var startTime = DateTime.UtcNow.AddDays(-30 + i * 2).Date.AddHours(9 + (i % 8));
                var endTime = startTime.AddHours(1);
                
                var booking = new Booking
                {
                    UserId = sampleUserIds[i % sampleUserIds.Length],
                    TrainerId = trainer.Id!,
                    TrainerName = trainer.FullName,
                    StartTime = startTime,
                    EndTime = endTime,
                    Status = statuses[i % statuses.Length],
                    Notes = $"Session {i + 1}",
                    CreatedAt = startTime.AddDays(-7),
                    UpdatedAt = startTime.AddDays(-1)
                };
                bookings.Add(booking);
            }
            
            if (bookings.Any())
            {
                await bookingsCollection.InsertManyAsync(bookings);
                Console.WriteLine($"✅ Created {bookings.Count} bookings");
            }
            
            Console.WriteLine("");
            Console.WriteLine("✅ Trainer Booking Service seeded successfully!");
            Console.WriteLine($"- {trainers.Count} trainers");
            Console.WriteLine($"- {bookings.Count} bookings");
        }
    }
}
