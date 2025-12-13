using MongoDB.Driver;
using SubscriptionService.Models;

namespace SubscriptionService.Services
{
    public class SubscriptionService
    {
        private readonly IMongoCollection<Subscription> _subscriptions;
        private readonly IMongoCollection<Plan> _plans;
        private readonly IMongoCollection<Payment> _payments;

        public SubscriptionService(IConfiguration config)
        {
            var connectionString = Environment.GetEnvironmentVariable("MONGODB_URI") 
                ?? config["DatabaseSettings:ConnectionString"]
                ?? "mongodb://localhost:27017";
            var databaseName = config["DatabaseSettings:DatabaseName"] ?? "fitness_subscriptions";
            
            var client = new MongoClient(connectionString);
            var db = client.GetDatabase(databaseName);
            _subscriptions = db.GetCollection<Subscription>("subscriptions");
            _plans = db.GetCollection<Plan>("subscription_plans");
            _payments = db.GetCollection<Payment>("payments");
        }

        // Plans
        public async Task<List<Plan>> GetAllPlans(bool activeOnly = false)
        {
            var filter = activeOnly 
                ? Builders<Plan>.Filter.Eq(p => p.IsActive, true)
                : Builders<Plan>.Filter.Empty;
            return await _plans.Find(filter).ToListAsync();
        }

        public async Task<Plan?> GetPlan(string id) =>
            await _plans.Find(p => p.Id == id).FirstOrDefaultAsync();

        public async Task CreatePlan(Plan plan)
        {
            plan.CreatedAt = DateTime.UtcNow;
            plan.UpdatedAt = DateTime.UtcNow;
            await _plans.InsertOneAsync(plan);
        }

        public async Task UpdatePlan(string id, Plan plan)
        {
            plan.UpdatedAt = DateTime.UtcNow;
            await _plans.ReplaceOneAsync(p => p.Id == id, plan);
        }

        // Subscriptions
        public async Task<List<Subscription>> GetAll() =>
            await _subscriptions.Find(_ => true).ToListAsync();

        public async Task<Subscription?> Get(string id) =>
            await _subscriptions.Find(s => s.Id == id).FirstOrDefaultAsync();

        public async Task<Subscription?> GetByUserId(string userId) =>
            await _subscriptions.Find(s => s.UserId == userId && s.Status == "active")
                .SortByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

        public async Task<List<Subscription>> GetAllByUserId(string userId) =>
            await _subscriptions.Find(s => s.UserId == userId).ToListAsync();

        public async Task<Subscription> Create(Subscription sub)
        {
            var plan = await GetPlan(sub.PlanId);
            if (plan != null)
            {
                sub.PlanName = plan.Name;
                sub.EndDate = sub.StartDate.AddDays(plan.DurationDays);
            }
            sub.CreatedAt = DateTime.UtcNow;
            sub.UpdatedAt = DateTime.UtcNow;
            await _subscriptions.InsertOneAsync(sub);
            return sub;
        }

        public async Task Update(string id, Subscription sub)
        {
            sub.UpdatedAt = DateTime.UtcNow;
            await _subscriptions.ReplaceOneAsync(s => s.Id == id, sub);
        }

        public async Task Delete(string id) =>
            await _subscriptions.DeleteOneAsync(s => s.Id == id);

        // Payments
        public async Task<List<Payment>> GetPaymentsByUserId(string userId) =>
            await _payments.Find(p => p.UserId == userId).ToListAsync();

        public async Task<List<Payment>> GetPaymentsBySubscriptionId(string subscriptionId) =>
            await _payments.Find(p => p.SubscriptionId == subscriptionId).ToListAsync();

        public async Task CreatePayment(Payment payment)
        {
            payment.CreatedAt = DateTime.UtcNow;
            await _payments.InsertOneAsync(payment);
        }
    }
}
