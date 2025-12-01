using SubscriptionService.Services;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<SubscriptionService.Services.SubscriptionService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Subscription Service API",
        Version = "v1",
        Description = "API for managing fitness app subscriptions",
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
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Subscription Service API v1");
    c.RoutePrefix = "api-docs";
});

app.MapControllers();

Console.WriteLine($"Subscription Service (C#) running on port {builder.Configuration["PORT"] ?? "3002"}");
Console.WriteLine($"Swagger UI available at: http://localhost:{builder.Configuration["PORT"] ?? "3002"}/api-docs");

app.Run();
