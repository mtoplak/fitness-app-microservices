namespace SubscriptionService.Models
{
    public class ReportPeriod
    {
        public string Start { get; set; } = "";
        public string End { get; set; } = "";
    }

    public class PackageRevenue
    {
        public string PackageName { get; set; } = "";
        public decimal Price { get; set; }
        public int Count { get; set; }
        public decimal Revenue { get; set; }
    }

    public class MonthlyRevenue
    {
        public string Month { get; set; } = "";
        public int Year { get; set; }
        public int MonthNumber { get; set; }
        public decimal Revenue { get; set; }
        public int ActiveMemberships { get; set; }
    }

    public class RevenueReport
    {
        public ReportPeriod Period { get; set; } = new ReportPeriod();
        public decimal TotalRevenue { get; set; }
        public List<PackageRevenue> SubscriptionsByPackage { get; set; } = new();
        public List<MonthlyRevenue> MonthlyRevenue { get; set; } = new();
        public int TotalActiveMemberships { get; set; }
    }
}
