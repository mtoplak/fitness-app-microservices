using SubscriptionService.Logging;

namespace SubscriptionService.Middleware
{
    public class LoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly RabbitMQLogger _logger;

        public LoggingMiddleware(RequestDelegate next, RabbitMQLogger logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var url = $"{context.Request.Scheme}://{context.Request.Host}{context.Request.Path}{context.Request.QueryString}";
            var correlationId = context.Items["CorrelationId"]?.ToString() ?? "no-correlation-id";

            // Log incoming request
            _logger.Info(
                url,
                correlationId,
                $"{context.Request.Method} {context.Request.Path}",
                new
                {
                    method = context.Request.Method,
                    ip = context.Connection.RemoteIpAddress?.ToString(),
                    userAgent = context.Request.Headers["User-Agent"].ToString()
                }
            );

            await _next(context);

            // Log response
            _logger.Info(
                url,
                correlationId,
                $"Response {context.Response.StatusCode} for {context.Request.Method} {context.Request.Path}"
            );
        }
    }

    public static class LoggingMiddlewareExtensions
    {
        public static IApplicationBuilder UseRabbitMQLogging(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<LoggingMiddleware>();
        }
    }
}
