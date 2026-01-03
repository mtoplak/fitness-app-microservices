using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace TrainerBookingService.Logging
{
    public enum LogType
    {
        INFO,
        ERROR,
        WARN
    }

    public class LogData
    {
        public DateTime Timestamp { get; set; }
        public string LogType { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string CorrelationId { get; set; } = string.Empty;
        public string ApplicationName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public object? AdditionalData { get; set; }
    }

    public class RabbitMQLogger : IDisposable
    {
        private readonly IConnection? _connection;
        private readonly IModel? _channel;
        private readonly string _exchange;
        private readonly string _applicationName;
        private bool _isConnected;

        public RabbitMQLogger(string rabbitMqUrl, string exchange, string applicationName)
        {
            _exchange = exchange;
            _applicationName = applicationName;
            _isConnected = false;

            try
            {
                var factory = new ConnectionFactory { Uri = new Uri(rabbitMqUrl) };
                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();

                _channel.ExchangeDeclare(exchange: _exchange, type: ExchangeType.Topic, durable: true);
                _isConnected = true;

                Console.WriteLine($"✅ RabbitMQ Logger connected for {_applicationName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to connect RabbitMQ Logger: {ex.Message}");
                _isConnected = false;
            }
        }

        public void Log(LogType logType, string url, string correlationId, string message, object? additionalData = null)
        {
            var logData = new LogData
            {
                Timestamp = DateTime.UtcNow,
                LogType = logType.ToString(),
                Url = url,
                CorrelationId = correlationId,
                ApplicationName = _applicationName,
                Message = message,
                AdditionalData = additionalData
            };

            var consoleLog = $"{logData.Timestamp:O} {logData.LogType} {url} Correlation: {correlationId} [{_applicationName}] - {message}";
            Console.WriteLine(consoleLog);

            if (!_isConnected || _channel == null)
            {
                Console.WriteLine("⚠️ RabbitMQ not connected, logging to console only");
                return;
            }

            try
            {
                var routingKey = $"log.{logType.ToString().ToLower()}";
                var json = JsonSerializer.Serialize(logData);
                var body = Encoding.UTF8.GetBytes(json);

                var properties = _channel.CreateBasicProperties();
                properties.Persistent = true;

                _channel.BasicPublish(
                    exchange: _exchange,
                    routingKey: routingKey,
                    basicProperties: properties,
                    body: body
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to send log to RabbitMQ: {ex.Message}");
            }
        }

        public void Info(string url, string correlationId, string message, object? additionalData = null)
        {
            Log(LogType.INFO, url, correlationId, message, additionalData);
        }

        public void Error(string url, string correlationId, string message, object? additionalData = null)
        {
            Log(LogType.ERROR, url, correlationId, message, additionalData);
        }

        public void Warn(string url, string correlationId, string message, object? additionalData = null)
        {
            Log(LogType.WARN, url, correlationId, message, additionalData);
        }

        public void Dispose()
        {
            try
            {
                _channel?.Close();
                _connection?.Close();
                Console.WriteLine("✅ RabbitMQ Logger connection closed");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error closing RabbitMQ Logger: {ex.Message}");
            }
        }
    }
}
