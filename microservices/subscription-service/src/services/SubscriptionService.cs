using MongoDB.Driver;
using SubscriptionService.Models;
using System.Globalization;

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
            _plans = db.GetCollection<Plan>("plans");
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
                sub.PlanPrice = plan.Price;
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

        public async Task<RevenueReport> GetRevenueReport(DateTime start, DateTime end)
        {
            var payments = await GetPaymentsInRange(start, end);
            var subscriptionIds = payments
                .Select(p => p.SubscriptionId)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct()
                .ToList();
            var subscriptions = await GetSubscriptionsByIds(subscriptionIds);
            var subscriptionById = subscriptions
                .Where(s => !string.IsNullOrWhiteSpace(s.Id))
                .ToDictionary(s => s.Id!, s => s);
            var activeSubscriptions = await GetActiveSubscriptionsInRange(start, end);
            var totalRevenue = payments.Sum(p => p.Amount);

            var byPackage = payments
                .Select(p =>
                {
                    subscriptionById.TryGetValue(p.SubscriptionId, out var sub);
                    var name = sub?.PlanName ?? "Unknown";
                    var price = sub?.PlanPrice ?? 0m;
                    return new { name, price, amount = p.Amount };
                })
                .GroupBy(x => new { x.name, x.price })
                .Select(group => new PackageRevenue
                {
                    PackageName = group.Key.name,
                    Price = group.Key.price,
                    Count = group.Count(),
                    Revenue = group.Sum(x => x.amount)
                })
                .OrderByDescending(group => group.Revenue)
                .ToList();

            var monthly = new List<MonthlyRevenue>();
            var culture = CultureInfo.GetCultureInfo("sl-SI");
            var cursor = new DateTime(start.Year, start.Month, 1);
            var endCursor = new DateTime(end.Year, end.Month, 1);

            while (cursor <= endCursor)
            {
                var monthStart = cursor;
                var monthEnd = cursor.AddMonths(1).AddTicks(-1);
                var monthRevenue = payments
                    .Where(p => p.PaymentDate >= monthStart && p.PaymentDate <= monthEnd)
                    .Sum(p => p.Amount);
                var activeCount = CountActiveAt(activeSubscriptions, monthEnd);

                monthly.Add(new MonthlyRevenue
                {
                    Month = monthStart.ToString("MMM", culture),
                    Year = monthStart.Year,
                    MonthNumber = monthStart.Month,
                    Revenue = monthRevenue,
                    ActiveMemberships = activeCount
                });

                cursor = cursor.AddMonths(1);
            }

            return new RevenueReport
            {
                Period = new ReportPeriod
                {
                    Start = start.ToString("yyyy-MM-dd"),
                    End = end.ToString("yyyy-MM-dd")
                },
                TotalRevenue = totalRevenue,
                SubscriptionsByPackage = byPackage,
                MonthlyRevenue = monthly,
                TotalActiveMemberships = CountActiveAt(activeSubscriptions, end)
            };
        }

        private async Task<List<Payment>> GetPaymentsInRange(DateTime start, DateTime end)
        {
            var filter = Builders<Payment>.Filter.And(
                Builders<Payment>.Filter.Gte(p => p.PaymentDate, start),
                Builders<Payment>.Filter.Lte(p => p.PaymentDate, end),
                Builders<Payment>.Filter.Eq(p => p.Status, "completed")
            );
            return await _payments.Find(filter).ToListAsync();
        }

        private async Task<List<Subscription>> GetSubscriptionsByIds(List<string> ids)
        {
            if (ids.Count == 0)
            {
                return new List<Subscription>();
            }

            var filter = Builders<Subscription>.Filter.In(s => s.Id, ids);
            return await _subscriptions.Find(filter).ToListAsync();
        }

        private async Task<List<Subscription>> GetActiveSubscriptionsInRange(DateTime start, DateTime end)
        {
            var filter = Builders<Subscription>.Filter.And(
                Builders<Subscription>.Filter.Eq(s => s.Status, "active"),
                Builders<Subscription>.Filter.Lte(s => s.StartDate, end),
                Builders<Subscription>.Filter.Gte(s => s.EndDate, start)
            );
            return await _subscriptions.Find(filter).ToListAsync();
        }

        private static int CountActiveAt(List<Subscription> subscriptions, DateTime date)
        {
            return subscriptions.Count(s => s.StartDate <= date && s.EndDate >= date);
        }
    }
}
