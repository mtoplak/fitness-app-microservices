using SubscriptionService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<SubscriptionService.Services.SubscriptionService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();

app.Run();
