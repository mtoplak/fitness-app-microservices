using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SubscriptionService.Models
{
    [BsonIgnoreExtraElements]
    public class Plan
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("name")]
        public string Name { get; set; } = null!;

        [BsonElement("description")]
        public string? Description { get; set; }

        [BsonElement("price")]
        public decimal Price { get; set; }

        [BsonElement("durationDays")]
        public int DurationDays { get; set; }

        [BsonElement("accessLevel")]
        public int AccessLevel { get; set; } = 1;

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("features")]
        public List<string> Features { get; set; } = new List<string>();

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
