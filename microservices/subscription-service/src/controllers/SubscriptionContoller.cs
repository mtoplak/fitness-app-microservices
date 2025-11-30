using Microsoft.AspNetCore.Mvc;
using SubscriptionService.Models;
using SubscriptionService.Services;

namespace SubscriptionService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionController : ControllerBase
    {
        private readonly SubscriptionService.Services.SubscriptionService _service;

        public SubscriptionController(SubscriptionService.Services.SubscriptionService service)
        {
            _service = service;
        }

        // GET 1: all subscriptions
        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _service.GetAll());

        // GET 2: one subscription
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(string id)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();
            return Ok(sub);
        }

        // POST 1: create purchase
        [HttpPost]
        public async Task<IActionResult> Create(Subscription s)
        {
            await _service.Create(s);
            return CreatedAtAction(nameof(Get), new { id = s.Id}, s);
        }

        // POST 2: extend subscription
        [HttpPost("{id}/extend")]
        public async Task<IActionResult> Extend(string id, [FromBody] int days)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();

            sub.EndDate = sub.EndDate.AddDays(days);
            await _service.Update(id, sub);

            return Ok(sub);
        }

        // PUT 1: update subscription fully
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, Subscription s)
        {
            var exists = await _service.Get(id);
            if (exists == null) return NotFound();

            s.Id = id;
            await _service.Update(id, s);
            return NoContent();
        }

        // PUT 2: cancel
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> Cancel(string id)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();

            sub.Active = false;
            await _service.Update(id, sub);

            return Ok(sub);
        }

        // DELETE 1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            await _service.Delete(id);
            return NoContent();
        }

        // DELETE 2: delete all inactive subscriptions
        [HttpDelete("inactive/all")]
        public async Task<IActionResult> DeleteInactive()
        {
            var all = await _service.GetAll();
            foreach (var s in all.Where(s => !s.Active))
                await _service.Delete(s.Id);

            return Ok("Inactive deleted.");
        }
    }
}
