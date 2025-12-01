using Microsoft.AspNetCore.Mvc;
using TrainerBookingService.Models;
using TrainerBookingService.Services;

namespace TrainerBookingService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class BookingController : ControllerBase
    {
        private readonly BookingService _service;

        public BookingController(BookingService service)
        {
            _service = service;
        }

        /// <summary>
        /// Get all trainer bookings
        /// </summary>
        /// <returns>List of all bookings</returns>
        /// <response code="200">Returns the list of bookings</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public ActionResult<List<Booking>> Get() => _service.GetAll();

        /// <summary>
        /// Get a specific trainer booking by ID
        /// </summary>
        /// <param name="id">Booking ID</param>
        /// <returns>The requested booking</returns>
        /// <response code="200">Returns the booking</response>
        /// <response code="404">If the booking is not found</response>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public ActionResult<Booking> Get(string id)
        {
            var booking = _service.Get(id);
            if (booking == null) return NotFound();
            return booking;
        }

        /// <summary>
        /// Create a new trainer booking
        /// </summary>
        /// <param name="booking">Booking details</param>
        /// <returns>The created booking</returns>
        /// <response code="201">Returns the newly created booking</response>
        /// <response code="400">If the booking data is invalid</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public ActionResult<Booking> Create([FromBody] Booking booking)
        {
            try
            {
                var created = _service.Create(booking);
                return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Delete a trainer booking
        /// </summary>
        /// <param name="id">Booking ID</param>
        /// <response code="204">Booking deleted successfully</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public IActionResult Delete(string id)
        {
            _service.Delete(id);
            return NoContent();
        }

        /// <summary>
        /// Health check endpoint
        /// </summary>
        /// <returns>Service status</returns>
        [HttpGet("/health")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult Health() => Ok("Trainer Booking Service is running");
    }
}
