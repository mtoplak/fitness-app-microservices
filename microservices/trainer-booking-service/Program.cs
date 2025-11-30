using TrainerBookingService.Models;
using TrainerBookingService.Services;

var builder = WebApplication.CreateBuilder(args);

// Bindamo DatabaseSettings iz appsettings.json
builder.Services.Configure<TrainerBookingDatabaseSettings>(
    builder.Configuration.GetSection("DatabaseSettings"));

// DI za BookingService
builder.Services.AddSingleton<BookingService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();
