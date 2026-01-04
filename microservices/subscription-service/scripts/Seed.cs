using MongoDB.Driver;
using MongoDB.Bson;
using SubscriptionService.Models;

namespace SubscriptionService.Scripts
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("🌱 Seeding Subscription Service...");
            
            var mongoUri = Environment.GetEnvironmentVariable("MONGODB_URI") 
                ?? "mongodb://admin:admin123@localhost:27019/fitness_subscriptions?authSource=admin";
            
            var client = new MongoClient(mongoUri);
            var database = client.GetDatabase("fitness_subscriptions");
            
            // Clear existing data
            await database.DropCollectionAsync("subscriptions");
            await database.DropCollectionAsync("plans");
            await database.DropCollectionAsync("payments");
            
            var subscriptionsCollection = database.GetCollection<Subscription>("subscriptions");
            var plansCollection = database.GetCollection<Plan>("plans");
            var paymentsCollection = database.GetCollection<Payment>("payments");
            
            // Create subscription plans
            var plans = new[]
            {
                new Plan
                {
                    Name = "Basic",
                    Description = "Access to basic gym facilities",
                    Price = 29.99m,
                    DurationDays = 30,
                    AccessLevel = 1,
                    Features = new List<string> { "Gym access", "Locker room" },
                    IsActive = true
                },
                new Plan
                {
                    Name = "Premium",
                    Description = "Full access with personal training sessions",
                    Price = 59.99m,
                    DurationDays = 30,
                    AccessLevel = 2,
                    Features = new List<string> { "Gym access", "Locker room", "2 PT sessions/month", "Group classes" },
                    IsActive = true
                },
                new Plan
                {
                    Name = "Elite",
                    Description = "All-inclusive membership with unlimited benefits",
                    Price = 99.99m,
                    DurationDays = 30,
                    AccessLevel = 3,
                    Features = new List<string> { "Gym access", "Locker room", "Unlimited PT sessions", "Group classes", "Spa access", "Nutrition consulting" },
                    IsActive = true
                },
                new Plan
                {
                    Name = "Student",
                    Description = "Discounted plan for students",
                    Price = 19.99m,
                    DurationDays = 30,
                    AccessLevel = 1,
                    Features = new List<string> { "Gym access", "Locker room", "Group classes" },
                    IsActive = true
                }
            };
            
            await plansCollection.InsertManyAsync(plans);
            Console.WriteLine($"✅ Created {plans.Length} subscription plans");
            
            // Note: In a real scenario, you'd need actual user IDs from the user-service
            // For demo purposes, creating some sample subscriptions with placeholder user IDs
            var sampleUserIds = new[]
            {
                ObjectId.GenerateNewId().ToString(),
                ObjectId.GenerateNewId().ToString(),
                ObjectId.GenerateNewId().ToString(),
                ObjectId.GenerateNewId().ToString(),
                ObjectId.GenerateNewId().ToString()
            };
            
            var subscriptions = new List<Subscription>();
            var payments = new List<Payment>();
            
            for (int i = 0; i < sampleUserIds.Length; i++)
            {
                var planIndex = i % plans.Length;
                var plan = plans[planIndex];
                var startDate = DateTime.UtcNow.AddDays(-30 * (i / 2));
                
                var subscription = new Subscription
                {
                    UserId = sampleUserIds[i],
                    PlanId = plan.Id!,
                    PlanName = plan.Name,
                    Status = "active",
                    StartDate = startDate,
                    EndDate = startDate.AddDays(plan.DurationDays),
                    AutoRenew = i % 2 == 0
                };
                subscriptions.Add(subscription);
                
                // Create a payment for this subscription
                var payment = new Payment
                {
                    SubscriptionId = subscription.Id ?? ObjectId.GenerateNewId().ToString(),
                    UserId = subscription.UserId,
                    Amount = plan.Price,
                    Status = "completed",
                    PaymentMethod = i % 3 == 0 ? "credit_card" : i % 3 == 1 ? "paypal" : "bank_transfer",
                    TransactionId = $"txn_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    PaymentDate = startDate
                };
                payments.Add(payment);
            }
            
            if (subscriptions.Any())
            {
                await subscriptionsCollection.InsertManyAsync(subscriptions);
                Console.WriteLine($"✅ Created {subscriptions.Count} subscriptions");
            }
            
            if (payments.Any())
            {
                await paymentsCollection.InsertManyAsync(payments);
                Console.WriteLine($"✅ Created {payments.Count} payments");
            }
            
            Console.WriteLine("");
            Console.WriteLine("✅ Subscription Service seeded successfully!");
            Console.WriteLine($"- {plans.Length} subscription plans");
            Console.WriteLine($"- {subscriptions.Count} subscriptions");
            Console.WriteLine($"- {payments.Count} payments");
        }
    }
}
