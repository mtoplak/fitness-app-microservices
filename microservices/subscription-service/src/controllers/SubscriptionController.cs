using Microsoft.AspNetCore.Mvc;
using SubscriptionService.Models;
using SubscriptionService.Services;

namespace SubscriptionService.Controllers
{
    [ApiController]
    [Route("api")]
    [Produces("application/json")]
    public class SubscriptionController : ControllerBase
    {
        private readonly SubscriptionService.Services.SubscriptionService _service;

        public SubscriptionController(SubscriptionService.Services.SubscriptionService service)
        {
            _service = service;
        }

        // ========== PLANS ==========

        /// <summary>
        /// Get all subscription plans
        /// </summary>
        /// <param name="activeOnly">Filter only active plans</param>
        /// <returns>List of plans</returns>
        [HttpGet("plans")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPlans([FromQuery] bool activeOnly = false) =>
            Ok(await _service.GetAllPlans(activeOnly));

        /// <summary>
        /// Get a specific plan by ID
        /// </summary>
        [HttpGet("plans/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetPlan(string id)
        {
            var plan = await _service.GetPlan(id);
            if (plan == null) return NotFound();
            return Ok(plan);
        }

        /// <summary>
        /// Create a new plan (admin only)
        /// </summary>
        [HttpPost("plans")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        public async Task<IActionResult> CreatePlan([FromBody] Plan plan)
        {
            await _service.CreatePlan(plan);
            return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, plan);
        }

        /// <summary>
        /// Update a plan (admin only)
        /// </summary>
        [HttpPut("plans/{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdatePlan(string id, [FromBody] Plan plan)
        {
            var exists = await _service.GetPlan(id);
            if (exists == null) return NotFound();
            plan.Id = id;
            await _service.UpdatePlan(id, plan);
            return NoContent();
        }

        // ========== SUBSCRIPTIONS ==========

        /// <summary>
        /// Get all subscriptions
        /// </summary>
        [HttpGet("subscriptions")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll() =>
            Ok(await _service.GetAll());

        /// <summary>
        /// Get a specific subscription by ID
        /// </summary>
        [HttpGet("subscriptions/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Get(string id)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();
            return Ok(sub);
        }

        /// <summary>
        /// Get active subscription for a user
        /// </summary>
        [HttpGet("subscriptions/user/{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetByUserId(string userId)
        {
            var sub = await _service.GetByUserId(userId);
            return Ok(sub);
        }

        /// <summary>
        /// Get all subscriptions for a user
        /// </summary>
        [HttpGet("subscriptions/user/{userId}/all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllByUserId(string userId) =>
            Ok(await _service.GetAllByUserId(userId));

        /// <summary>
        /// Create a new subscription
        /// </summary>
        [HttpPost("subscriptions")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        public async Task<IActionResult> Create([FromBody] CreateSubscriptionRequest request)
        {
            var sub = new Subscription
            {
                UserId = request.UserId,
                PlanId = request.PlanId,
                StartDate = DateTime.UtcNow,
                Status = "active",
                AutoRenew = true
            };

            var created = await _service.Create(sub);

            // Create payment record
            var plan = await _service.GetPlan(request.PlanId);
            if (plan != null)
            {
                var payment = new Payment
                {
                    UserId = request.UserId,
                    SubscriptionId = created.Id!,
                    Amount = plan.Price,
                    Status = "completed",
                    PaymentMethod = request.PaymentMethod ?? "credit_card",
                    TransactionId = Guid.NewGuid().ToString()
                };
                await _service.CreatePayment(payment);
            }

            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }

        /// <summary>
        /// Cancel a subscription
        /// </summary>
        [HttpPost("subscriptions/{id}/cancel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Cancel(string id, [FromBody] CancelRequest? request)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();

            sub.Status = "cancelled";
            sub.CancelledAt = DateTime.UtcNow;
            sub.CancelReason = request?.Reason;
            await _service.Update(id, sub);

            return Ok(sub);
        }

        /// <summary>
        /// Renew a subscription
        /// </summary>
        [HttpPost("subscriptions/{id}/renew")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Renew(string id)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();

            var plan = await _service.GetPlan(sub.PlanId);
            if (plan == null) return BadRequest("Plan not found");

            sub.StartDate = sub.EndDate > DateTime.UtcNow ? sub.EndDate : DateTime.UtcNow;
            sub.EndDate = sub.StartDate.AddDays(plan.DurationDays);
            sub.Status = "active";
            await _service.Update(id, sub);

            // Create payment
            var payment = new Payment
            {
                UserId = sub.UserId,
                SubscriptionId = sub.Id!,
                Amount = plan.Price,
                Status = "completed",
                PaymentMethod = "credit_card",
                TransactionId = Guid.NewGuid().ToString()
            };
            await _service.CreatePayment(payment);

            return Ok(sub);
        }

        /// <summary>
        /// Reactivate a cancelled subscription
        /// </summary>
        [HttpPost("subscriptions/{id}/reactivate")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Reactivate(string id)
        {
            var sub = await _service.Get(id);
            if (sub == null) return NotFound();

            if (sub.EndDate < DateTime.UtcNow)
                return BadRequest("Subscription has expired. Please purchase a new subscription.");

            sub.Status = "active";
            sub.AutoRenew = true;
            sub.CancelledAt = null;
            sub.CancelReason = null;
            await _service.Update(id, sub);

            return Ok(sub);
        }

        // ========== PAYMENTS ==========

        /// <summary>
        /// Get payments for a user
        /// </summary>
        [HttpGet("payments/user/{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPaymentsByUserId(string userId) =>
            Ok(await _service.GetPaymentsByUserId(userId));

        /// <summary>
        /// Get payments for a subscription
        /// </summary>
        [HttpGet("payments/subscription/{subscriptionId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPaymentsBySubscription(string subscriptionId) =>
            Ok(await _service.GetPaymentsBySubscriptionId(subscriptionId));

        /// <summary>
        /// Health check
        /// </summary>
        [HttpGet("/health")]
        public IActionResult Health() => Ok("Subscription Service is running");
    }

    public class CreateSubscriptionRequest
    {
        public string UserId { get; set; } = null!;
        public string PlanId { get; set; } = null!;
        public string? PaymentMethod { get; set; }
    }

    public class CancelRequest
    {
        public string? Reason { get; set; }
    }
}
