using Microsoft.AspNetCore.Mvc;
using TrainerBookingService.Models;
using TrainerBookingService.Services;

namespace TrainerBookingService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingController : ControllerBase
    {
        private readonly BookingService _service;

        public BookingController(BookingService service)
        {
            _service = service;
        }

        [HttpGet]
        public ActionResult<List<Booking>> Get() => _service.GetAll();

        [HttpGet("{id}")]
        public ActionResult<Booking> Get(string id)
        {
            var booking = _service.Get(id);
            if (booking == null) return NotFound();
            return booking;
        }

        [HttpPost]
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

        [HttpDelete("{id}")]
        public IActionResult Delete(string id)
        {
            _service.Delete(id);
            return NoContent();
        }

        [HttpGet("/health")]
        public IActionResult Health() => Ok("Trainer Booking Service is running");
    }
}
