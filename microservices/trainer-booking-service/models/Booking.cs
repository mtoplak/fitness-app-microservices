using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TrainerBookingService.Models
{
    public class Booking
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = null!;

        [BsonElement("userId")]
        public string UserId { get; set; } = null!;

        [BsonElement("trainerId")]
        public string TrainerId { get; set; } = null!;

        [BsonElement("dateTime")]
        public DateTime DateTime { get; set; }

        [BsonElement("subscriptionPackage")]
        public string SubscriptionPackage { get; set; } = null!;
    }
}
