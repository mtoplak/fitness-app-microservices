using Microsoft.AspNetCore.Mvc;
using TrainerBookingService.Models;
using TrainerBookingService.Services;

namespace TrainerBookingService.Controllers
{
    [ApiController]
    [Route("api")]
    [Produces("application/json")]
    public class BookingController : ControllerBase
    {
        private readonly BookingService _service;

        public BookingController(BookingService service)
        {
            _service = service;
        }

        // ========== TRAINERS ==========

        /// <summary>
        /// Get all trainers
        /// </summary>
        [HttpGet("trainers")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public ActionResult<List<TrainerProfile>> GetTrainers() => 
            Ok(_service.GetAllTrainers());

        /// <summary>
        /// Get a specific trainer by ID
        /// </summary>
        [HttpGet("trainers/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public ActionResult<TrainerProfile> GetTrainer(string id)
        {
            var trainer = _service.GetTrainer(id);
            if (trainer == null) return NotFound();
            return Ok(trainer);
        }

        /// <summary>
        /// Get trainer availability slots
        /// </summary>
        [HttpGet("trainers/{id}/availability")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public ActionResult<List<AvailabilitySlot>> GetTrainerAvailability(
            string id,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            var trainer = _service.GetTrainer(id);
            if (trainer == null) return NotFound();

            if (from == default || to == default || to <= from)
            {
                return BadRequest(new { message = "Invalid availability range." });
            }

            try
            {
                var slots = _service.GetAvailability(id, from, to);
                return Ok(slots);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Create a new trainer profile
        /// </summary>
        [HttpPost("trainers")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        public ActionResult<TrainerProfile> CreateTrainer([FromBody] TrainerProfile trainer)
        {
            var created = _service.CreateTrainer(trainer);
            return CreatedAtAction(nameof(GetTrainer), new { id = created.Id }, created);
        }

        // ========== BOOKINGS ==========

        /// <summary>
        /// Get all trainer bookings
        /// </summary>
        [HttpGet("trainer-bookings")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public ActionResult<List<Booking>> GetAllBookings() => 
            Ok(_service.GetAll());

        /// <summary>
        /// Get trainer bookings within a date range
        /// </summary>
        [HttpGet("trainer-bookings/report")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public ActionResult<List<Booking>> GetBookingsReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            if (!TryNormalizeDateRange(startDate, endDate, out var start, out var end, out var error))
            {
                return BadRequest(new { message = error });
            }

            return Ok(_service.GetByDateRange(start, end));
        }

        /// <summary>
        /// Get a specific trainer booking by ID
        /// </summary>
        [HttpGet("trainer-bookings/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public ActionResult<Booking> Get(string id)
        {
            var booking = _service.Get(id);
            if (booking == null) return NotFound();
            return Ok(booking);
        }

        /// <summary>
        /// Get bookings for a user
        /// </summary>
        [HttpGet("trainer-bookings/user/{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public ActionResult<List<Booking>> GetByUser(string userId) =>
            Ok(_service.GetByUserId(userId));

        /// <summary>
        /// Get upcoming bookings for a user
        /// </summary>
        [HttpGet("trainer-bookings/user/{userId}/upcoming")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public ActionResult<List<Booking>> GetUpcoming(string userId) =>
            Ok(_service.GetUpcoming(userId));

        /// <summary>
        /// Get bookings for a trainer
        /// </summary>
        [HttpGet("trainer-bookings/trainer/{trainerId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public ActionResult<List<Booking>> GetByTrainer(string trainerId) =>
            Ok(_service.GetByTrainerId(trainerId));

        /// <summary>
        /// Create a new trainer booking
        /// </summary>
        [HttpPost("trainer-bookings")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public ActionResult<Booking> Create([FromBody] CreateBookingRequest request)
        {
            try
            {
                var booking = new Booking
                {
                    UserId = request.UserId,
                    TrainerId = request.TrainerId,
                    StartTime = request.StartTime,
                    EndTime = request.EndTime ?? request.StartTime.AddHours(1),
                    Notes = request.Notes,
                    Status = "confirmed"
                };
                var created = _service.Create(booking);
                return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cancel a trainer booking
        /// </summary>
        [HttpPost("trainer-bookings/{id}/cancel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public ActionResult<Booking> Cancel(string id)
        {
            var booking = _service.Cancel(id);
            if (booking == null) return NotFound();
            return Ok(booking);
        }

        /// <summary>
        /// Delete a trainer booking
        /// </summary>
        [HttpDelete("trainer-bookings/{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public IActionResult Delete(string id)
        {
            _service.Delete(id);
            return NoContent();
        }

        /// <summary>
        /// Health check endpoint
        /// </summary>
        [HttpGet("/health")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult Health() => Ok("Trainer Booking Service is running");

        private static bool TryNormalizeDateRange(
            DateTime? startDate,
            DateTime? endDate,
            out DateTime start,
            out DateTime end,
            out string error)
        {
            var fallbackStart = DateTime.UtcNow.AddMonths(-3).Date;
            var fallbackEnd = DateTime.UtcNow.Date;

            start = (startDate ?? fallbackStart).Date;
            end = (endDate ?? fallbackEnd).Date.AddDays(1).AddTicks(-1);
            error = string.Empty;

            if (end < start)
            {
                error = "Invalid date range.";
                return false;
            }

            return true;
        }
    }

    public class CreateBookingRequest
    {
        public string UserId { get; set; } = null!;
        public string TrainerId { get; set; } = null!;
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string? Notes { get; set; }
    }
}
