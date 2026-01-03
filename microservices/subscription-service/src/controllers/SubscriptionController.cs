using Microsoft.AspNetCore.Mvc;
using SubscriptionService.Models;
using SubscriptionService.Services;

namespace SubscriptionService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class SubscriptionController : ControllerBase
    {
        private readonly SubscriptionService.Services.SubscriptionService _service;

        public SubscriptionController(SubscriptionService.Services.SubscriptionService service)
        {
            _service = service;
        }

        /// <summary>
        /// Get all subscriptions
        /// </summary>
        /// <returns>List of all subscriptions</returns>
        /// <response code="200">Returns the list of subscriptions</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll() =>
            Ok(await _service.GetAll());

        /// <summary>
        /// Get a specific subscription by ID
        /// </summary>
        /// <param name="id">Subscription ID</param>
        /// <returns>The requested subscription</returns>
        /// <response code="200">Returns the subscription</response>
        /// <response code="404">If the subscription is not found</response>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Get(string id)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();
            return Ok(sub);
        }

        /// <summary>
        /// Create a new subscription
        /// </summary>
        /// <param name="s">Subscription details</param>
        /// <returns>The created subscription</returns>
        /// <response code="201">Returns the newly created subscription</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        public async Task<IActionResult> Create(Subscription s)
        {
            await _service.Create(s);
            return CreatedAtAction(nameof(Get), new { id = s.Id}, s);
        }

        /// <summary>
        /// Extend a subscription by number of days
        /// </summary>
        /// <param name="id">Subscription ID</param>
        /// <param name="days">Number of days to extend</param>
        /// <returns>The updated subscription</returns>
        /// <response code="200">Returns the extended subscription</response>
        /// <response code="404">If the subscription is not found</response>
        [HttpPost("{id}/extend")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Extend(string id, [FromBody] int days)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();

            sub.EndDate = sub.EndDate.AddDays(days);
            await _service.Update(id, sub);

            return Ok(sub);
        }

        /// <summary>
        /// Update a subscription
        /// </summary>
        /// <param name="id">Subscription ID</param>
        /// <param name="s">Updated subscription details</param>
        /// <response code="204">Subscription updated successfully</response>
        /// <response code="404">If the subscription is not found</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string id, Subscription s)
        {
            var exists = await _service.Get(id);
            if (exists == null) return NotFound();

            s.Id = id;
            await _service.Update(id, s);
            return NoContent();
        }

        /// <summary>
        /// Cancel a subscription
        /// </summary>
        /// <param name="id">Subscription ID</param>
        /// <returns>The cancelled subscription</returns>
        /// <response code="200">Returns the cancelled subscription</response>
        /// <response code="404">If the subscription is not found</response>
        [HttpPut("{id}/cancel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Cancel(string id)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();

            sub.Status = "inactive";
            await _service.Update(id, sub);

            return Ok(sub);
        }

        /// <summary>
        /// Delete a subscription
        /// </summary>
        /// <param name="id">Subscription ID</param>
        /// <response code="204">Subscription deleted successfully</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Delete(string id)
        {
            await _service.Delete(id);
            return NoContent();
        }

        /// <summary>
        /// Delete all inactive subscriptions
        /// </summary>
        /// <returns>Confirmation message</returns>
        /// <response code="200">All inactive subscriptions deleted</response>
        [HttpDelete("inactive/all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> DeleteInactive()
        {
            var all = await _service.GetAll();
            foreach (var s in all.Where(s => s.Status != "active"))
                await _service.Delete(s.Id);

            return Ok("Inactive deleted.");
        }
    }
}
