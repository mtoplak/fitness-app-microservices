using TrainerBookingService.Models;
using TrainerBookingService.Services;
using TrainerBookingService.Logging;
using TrainerBookingService.Middleware;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Configure RabbitMQ Logger
var rabbitMqUrl = builder.Configuration["RABBITMQ_URL"] ?? "amqp://localhost:5672";
var rabbitMqExchange = builder.Configuration["RABBITMQ_EXCHANGE"] ?? "fitness-logs-exchange";
var logger = new RabbitMQLogger(rabbitMqUrl, rabbitMqExchange, "trainer-booking-service");
builder.Services.AddSingleton(logger);

// Bindamo DatabaseSettings iz appsettings.json
builder.Services.Configure<TrainerBookingDatabaseSettings>(
    builder.Configuration.GetSection("DatabaseSettings"));

// DI za BookingService
builder.Services.AddSingleton<BookingService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Trainer Booking Service API",
        Version = "v1",
        Description = "API for managing personal trainer bookings in the fitness app",
        Contact = new OpenApiContact
        {
            Name = "Fitness App Team"
        }
    });

    // Enable XML comments
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("AllowAll");

// Add Correlation ID middleware (must be before logging)
app.UseCorrelationId();

// Add Logging middleware
app.UseRabbitMQLogging();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Trainer Booking Service API v1");
    c.RoutePrefix = "api-docs";
});

app.MapControllers();

Console.WriteLine($"Trainer Booking Service running on port {builder.Configuration["PORT"] ?? "3003"}");
Console.WriteLine($"Swagger UI available at: http://localhost:{builder.Configuration["PORT"] ?? "3003"}/api-docs");

app.Run();
