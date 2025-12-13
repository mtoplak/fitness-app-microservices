using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TrainerBookingService.Models
{
    [BsonIgnoreExtraElements]
    public class Booking
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("userId")]
        public string UserId { get; set; } = null!;

        [BsonElement("trainerId")]
        public string TrainerId { get; set; } = null!;

        [BsonElement("trainerName")]
        public string? TrainerName { get; set; }

        [BsonElement("startTime")]
        public DateTime StartTime { get; set; }

        [BsonElement("endTime")]
        public DateTime EndTime { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "confirmed";

        [BsonElement("notes")]
        public string? Notes { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = System.DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = System.DateTime.UtcNow;

        // Legacy compatibility
        [BsonElement("dateTime")]
        [BsonIgnoreIfNull]
        public DateTime? LegacyDateTime { get; set; }

        [BsonElement("subscriptionPackage")]
        [BsonIgnoreIfNull]
        public string? SubscriptionPackage { get; set; }
    }

    [BsonIgnoreExtraElements]
    public class TrainerProfile
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("userId")]
        public string UserId { get; set; } = null!;

        [BsonElement("fullName")]
        public string FullName { get; set; } = null!;

        [BsonElement("email")]
        public string? Email { get; set; }

        [BsonElement("trainerType")]
        public string TrainerType { get; set; } = "both";

        [BsonElement("hourlyRate")]
        public decimal HourlyRate { get; set; }

        [BsonElement("specializations")]
        public List<string> Specializations { get; set; } = new List<string>();

        [BsonElement("bio")]
        public string? Bio { get; set; }

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
