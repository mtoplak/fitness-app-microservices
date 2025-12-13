using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SubscriptionService.Models
{
    [BsonIgnoreExtraElements]
    public class Subscription
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("userId")]
        public string UserId { get; set; } = null!;

        [BsonElement("planId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string PlanId { get; set; } = null!;

        [BsonElement("planName")]
        public string? PlanName { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "active";

        [BsonElement("startDate")]
        public DateTime StartDate { get; set; }

        [BsonElement("endDate")]
        public DateTime EndDate { get; set; }

        [BsonElement("autoRenew")]
        public bool AutoRenew { get; set; } = true;

        [BsonElement("cancelledAt")]
        public DateTime? CancelledAt { get; set; }

        [BsonElement("cancelReason")]
        public string? CancelReason { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [BsonIgnoreExtraElements]
    public class Payment
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("userId")]
        public string UserId { get; set; } = null!;

        [BsonElement("subscriptionId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string SubscriptionId { get; set; } = null!;

        [BsonElement("amount")]
        public decimal Amount { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "completed";

        [BsonElement("paymentMethod")]
        public string PaymentMethod { get; set; } = "credit_card";

        [BsonElement("transactionId")]
        public string? TransactionId { get; set; }

        [BsonElement("paymentDate")]
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
