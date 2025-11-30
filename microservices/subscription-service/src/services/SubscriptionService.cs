using MongoDB.Driver;
using SubscriptionService.Models;

namespace SubscriptionService.Services
{
    public class SubscriptionService
    {
        private readonly IMongoCollection<Subscription> _subscriptions;

        public SubscriptionService(IConfiguration config)
        {
            var client = new MongoClient(config["DatabaseSettings:ConnectionString"]);
            var db = client.GetDatabase(config["DatabaseSettings:DatabaseName"]);
            _subscriptions = db.GetCollection<Subscription>(config["DatabaseSettings:CollectionName"]);
        }

        public async Task<List<Subscription>> GetAll() =>
            await _subscriptions.Find(_ => true).ToListAsync();

        public async Task<Subscription> Get(string id) =>
            await _subscriptions.Find(s => s.Id == id).FirstOrDefaultAsync();

        public async Task Create(Subscription sub) =>
            await _subscriptions.InsertOneAsync(sub);

        public async Task Update(string id, Subscription sub) =>
            await _subscriptions.ReplaceOneAsync(s => s.Id == id, sub);

        public async Task Delete(string id) =>
            await _subscriptions.DeleteOneAsync(s => s.Id == id);
    }
}
