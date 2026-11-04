using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using EnterpriseInventory.Core.Enums;
using EnterpriseInventory.Core.Interfaces;
using EnterpriseInventory_Application.DTOs;
using EnterpriseInventory_Application.Interfaces;

namespace EnterpriseInventory_Application.Services;

public class AiCopilotService : IAiCopilotService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IForecastingService _forecastingService;
    private readonly ICatalogIntelligenceService _catalogIntelligenceService;
    private readonly IAnomalyDetectionService _anomalyService;
    private readonly ISupplierIntelligenceService _supplierIntelligenceService;

    public AiCopilotService(
        IUnitOfWork unitOfWork,
        IForecastingService forecastingService,
        ICatalogIntelligenceService catalogIntelligenceService,
        IAnomalyDetectionService anomalyService,
        ISupplierIntelligenceService supplierIntelligenceService)
    {
        _unitOfWork = unitOfWork;
        _forecastingService = forecastingService;
        _catalogIntelligenceService = catalogIntelligenceService;
        _anomalyService = anomalyService;
        _supplierIntelligenceService = supplierIntelligenceService;
    }

    public async Task<CopilotQueryResponseDto> ProcessQueryAsync(CopilotQueryRequestDto request)
    {
        var q = (request.Query ?? string.Empty).Trim().ToLowerInvariant();
        var response = new CopilotQueryResponseDto();

        if (string.IsNullOrWhiteSpace(q))
        {
            response.AnswerMarkdown = "Hello! I am your **Enterprise Inventory Copilot** (Phase 1, 2 & 3 Autonomous AI). You can ask me about **demand forecasting & dynamic restock**, **shrinkage & anomaly radar**, **supplier reliability scorecards & autonomous replenishment**, **overstocked capital**, **catalog deduplication**, or **warehouse valuations**.";
            response.FollowUpQuestions = new List<string>
            {
                "Scan for shrinkage & off-hours inventory anomalies",
                "Show supplier reliability scorecards & risk ratings",
                "Show AI restock recommendations",
                "How much capital is tied up in overstock?"
            };
            return response;
        }

        // 0. Phase 2: AI Forecasting, Dynamic Restock & Runway
        if ((q.Contains("forecast") || q.Contains("restock") || q.Contains("replenish") || q.Contains("runway") || q.Contains("burn rate") || (q.Contains("predict") && !q.Contains("order")))
            && !q.Contains("supplier") && !q.Contains("scorecard") && !q.Contains("vendor") && !q.Contains("autonomous"))
        {
            var summary = await _forecastingService.GetForecastSummaryAsync(request.WarehouseId);
            var recs = (await _forecastingService.GetRestockRecommendationsAsync(request.WarehouseId)).Take(6).ToList();

            response.Intent = "ForecastAndRestock";
            var sb = new StringBuilder();
            sb.AppendLine("### 🤖 Phase 2 AI Demand Forecast & Dynamic Restock");
            sb.AppendLine($"* **Critical Stockout Risk (<3 Days):** `{summary.CriticalItemsCount} items`");
            sb.AppendLine($"* **Total Restock Recommended:** `{summary.TotalAtRiskItems} items`");
            sb.AppendLine($"* **Overstocked Stagnant Products:** `{summary.OverstockedItemsCount} items` (${summary.TotalCapitalInOverstock:N2} tied up)\n");

            if (recs.Any())
            {
                sb.AppendLine("| Product SKU | Product Name | Facility | Daily Burn | Dynamic SS | Dynamic ROP | Runway | Suggested Qty | Est Cost |");
                sb.AppendLine("| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |");
                foreach (var r in recs)
                {
                    var runwayBadge = r.DaysOfStockRemaining <= 3 ? "🔴 Urgent" : "🟡 Advised";
                    sb.AppendLine($"| `{r.ProductSKU}` | **{r.ProductName}** | {r.WarehouseName} | {r.DailyBurnRate}/day | {r.DynamicSafetyStock} | {r.DynamicReorderPoint} | {r.DaysOfStockRemaining:F1}d ({runwayBadge}) | **+{r.RecommendedOrderQuantity}** | ${r.EstimatedOrderCost:N2} |");
                }
            }
            else
            {
                sb.AppendLine("✓ All warehouses are operating within optimal safety stock boundaries!");
            }

            response.AnswerMarkdown = sb.ToString();
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "Open Dynamic Restock Tab",
                Route = "/inventory",
                QueryParams = new Dictionary<string, string> { { "tab", "forecast" } },
                Icon = "🤖"
            });
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "View Operations Dashboard",
                Route = "/dashboard",
                Icon = "📊"
            });

            response.FollowUpQuestions = new List<string>
            {
                "How much capital is tied up in overstock?",
                "Which items have lead times longer than 10 days?",
                "Run an AI catalog deduplication audit"
            };
            return response;
        }

        // 0.1 Phase 2: Overstock & Tied-Up Capital Analysis
        if (q.Contains("overstock") || q.Contains("dead stock") || q.Contains("tied-up") || q.Contains("excess stock") || (q.Contains("capital") && q.Contains("stock")))
        {
            var alerts = (await _forecastingService.GetOverstockAlertsAsync(request.WarehouseId)).Take(6).ToList();
            var totalCapital = alerts.Sum(a => a.CapitalTiedUp);

            response.Intent = "OverstockAlerts";
            var sb = new StringBuilder();
            sb.AppendLine("### 💵 Phase 2 AI Overstock & Capital Efficiency Analysis");
            sb.AppendLine($"Identified **{alerts.Count} stagnant/overstocked inventory lines** with excess carrying inventory:\n");

            if (alerts.Any())
            {
                sb.AppendLine("| Product SKU | Product Name | Facility | Current Stock | Daily Burn | Runway (Days) | Excess Qty | Capital Tied Up |");
                sb.AppendLine("| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |");
                foreach (var a in alerts)
                {
                    sb.AppendLine($"| `{a.ProductSKU}` | **{a.ProductName}** | {a.WarehouseName} | {a.CurrentStock} | {a.DailyBurnRate}/day | **{a.DaysOfStockRemaining:F0} days** | +{a.ExcessQuantity} | **${a.CapitalTiedUp:N2}** |");
                }
                sb.AppendLine($"\n> **Strategic Recommendation:** Consider promotional liquidation discounts or inter-warehouse transfers to high-velocity distribution centers.");
            }
            else
            {
                sb.AppendLine("✓ Optimal inventory turns: No excessive carrying inventory detected across facilities!");
            }

            response.AnswerMarkdown = sb.ToString();
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "Explore Overstock in Inventory",
                Route = "/inventory",
                QueryParams = new Dictionary<string, string> { { "tab", "forecast" } },
                Icon = "⏳"
            });

            response.FollowUpQuestions = new List<string>
            {
                "Show AI restock recommendations",
                "Can we do a stock transfer between warehouses?",
                "What is our total warehouse valuation?"
            };
            return response;
        }

        // 0.2 Phase 2: AI Catalog Deduplication & Health Audit
        if (q.Contains("duplicate") || q.Contains("dedup") || q.Contains("catalog audit") || q.Contains("catalog health") || q.Contains("similar product"))
        {
            var audit = await _catalogIntelligenceService.GetCatalogAuditReportAsync();

            response.Intent = "CatalogAudit";
            var sb = new StringBuilder();
            sb.AppendLine("### 🏷️ Phase 2 AI Catalog Intelligence & Deduplication Report");
            sb.AppendLine($"* **Total Catalog Items Scanned:** `{audit.TotalProductsScanned} products`");
            sb.AppendLine($"* **Overall Catalog Quality Score:** **{audit.CatalogQualityScore}%**");
            sb.AppendLine($"* **Potential Duplicate Clusters:** `{audit.PotentialDuplicatePairsCount} pairs`");
            sb.AppendLine($"* **Category Misclassification Alerts:** `{audit.CategoryAnomaliesCount} alerts`\n");

            if (audit.DuplicatePairs.Any())
            {
                sb.AppendLine("| Existing Product A | Similar Product B | Match Score | Detection Reason |");
                sb.AppendLine("| :--- | :--- | :---: | :--- |");
                foreach (var pair in audit.DuplicatePairs.Take(5))
                {
                    sb.AppendLine($"| **{pair.ProductAName}** (`{pair.ProductASku}`) | **{pair.ProductBName}** (`{pair.ProductBSku}`) | <span style=\"color:#d97706\">**{pair.SimilarityScore * 100}%**</span> | {pair.SimilarityReason} |");
                }
            }
            else
            {
                sb.AppendLine("✓ Clean Catalog: No conflicting duplicate SKUs or near-duplicate titles detected!");
            }

            response.AnswerMarkdown = sb.ToString();
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "Open Catalog Audit Tool",
                Route = "/products",
                QueryParams = new Dictionary<string, string> { { "action", "audit" } },
                Icon = "🏷️"
            });

            response.FollowUpQuestions = new List<string>
            {
                "How do I auto-pick categories when adding a product?",
                "Show AI restock recommendations",
                "Show pending customer orders"
            };
            return response;
        }

        // 1. Low stock / low quantity / stockout query
        var isLowStockQuery = q.Contains("low stock") || q.Contains("low-stock") ||
            q.Contains("low quantity") || q.Contains("low qty") || q.Contains("low count") ||
            q.Contains("low item") || q.Contains("low product") || q.Contains("low invent") ||
            q.Contains("stockout") || q.Contains("stock-out") || q.Contains("out of stock") ||
            q.Contains("zero stock") || q.Contains("shortage") || q.Contains("deplet") ||
            q.Contains("reorder") || q.Contains("critical") || q.Contains("run out") ||
            q.Contains("running low") || q.Contains("insufficient") || q.Contains("safety stock") ||
            q == "low" || q.StartsWith("low ") || q.EndsWith(" low") ||
            (q.Contains("low") && (q.Contains("quant") || q.Contains("stock") || q.Contains("item") || q.Contains("level") || q.Contains("unit") || q.Contains("product"))) ||
            (q.Contains("quantity") && (q.Contains("low") || q.Contains("less") || q.Contains("short") || q.Contains("min") || q.Contains("critical")));

        if (isLowStockQuery)
        {
            var inventories = await _unitOfWork.Inventories.Query()
                .Include(i => i.Product)
                .Include(i => i.Warehouse)
                .Where(i => i.Quantity <= i.Product.ReorderLevel)
                .AsNoTracking()
                .Take(10)
                .ToListAsync();

            response.Intent = "LowStockAlerts";
            var sb = new StringBuilder();
            sb.AppendLine("### ⚠️ Low-Stock & Reorder Alerts");

            if (inventories.Any())
            {
                sb.AppendLine($"Found **{inventories.Count} inventory lines** currently at or below their safety reorder thresholds:\n");
                sb.AppendLine("| SKU | Product Name | Warehouse | On Hand | Reserved | Reorder Point | Status |");
                sb.AppendLine("| :--- | :--- | :--- | :---: | :---: | :---: | :---: |");

                foreach (var item in inventories)
                {
                    var avail = item.Quantity - item.ReservedQuantity;
                    var badge = avail <= 2 ? "🔴 Critical" : "🟡 Low";
                    sb.AppendLine($"| `{item.Product.SKU}` | **{item.Product.Name}** | {item.Warehouse.Name} | {item.Quantity} | {item.ReservedQuantity} | {item.Product.ReorderLevel} | {badge} |");
                }

                sb.AppendLine("\n> **Recommendation:** Consider initiating restocking purchase orders or inter-warehouse transfers to maintain service level agreements.");
            }
            else
            {
                sb.AppendLine("✓ Excellent news! All inventory items across all warehouse facilities are currently operating well above their safety stock and reorder thresholds.");
            }
            response.AnswerMarkdown = sb.ToString();

            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "View AI Restock Forecast",
                Route = "/inventory",
                QueryParams = new Dictionary<string, string> { { "tab", "forecast" } },
                Icon = "🤖"
            });
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "Open Inventory View",
                Route = "/inventory",
                QueryParams = new Dictionary<string, string> { { "tab", "alerts" } },
                Icon = "📦"
            });

            response.FollowUpQuestions = new List<string>
            {
                "What is the runway for PoE switches?",
                "Show all pending orders for these items",
                "Which suppliers supply low-stock items?"
            };
            return response;
        }

        // 2. Orders query (pending, confirmed, shipped, total)
        if (q.Contains("order") || q.Contains("sales") || q.Contains("pending") || q.Contains("delivery"))
        {
            var ordersQuery = _unitOfWork.Orders.Query()
                .Include(o => o.Warehouse)
                .Include(o => o.Items)
                .AsNoTracking();

            OrderStatus? targetStatus = null;
            if (q.Contains("pending")) targetStatus = OrderStatus.Pending;
            else if (q.Contains("cancel")) targetStatus = OrderStatus.Cancelled;
            else if (q.Contains("shipped")) targetStatus = OrderStatus.Shipped;
            else if (q.Contains("delivered")) targetStatus = OrderStatus.Delivered;

            if (targetStatus.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.Status == targetStatus.Value);
            }

            var recentOrders = await ordersQuery
                .OrderByDescending(o => o.OrderDate)
                .Take(5)
                .ToListAsync();

            var totalOrdersCount = await _unitOfWork.Orders.Query().CountAsync();
            var pendingCount = await _unitOfWork.Orders.Query().CountAsync(o => o.Status == OrderStatus.Pending);

            response.Intent = "OrderInquiry";
            var sb = new StringBuilder();
            sb.AppendLine($"### 📋 Order Fulfillment Status Overview");
            sb.AppendLine($"* Total Orders in System: **{totalOrdersCount}**");
            sb.AppendLine($"* Currently Pending: **{pendingCount}**\n");

            if (recentOrders.Any())
            {
                sb.AppendLine("| Order Number | Customer | Hub | Items | Total Amount | Status |");
                sb.AppendLine("| :--- | :--- | :--- | :---: | :---: | :---: |");
                foreach (var o in recentOrders)
                {
                    sb.AppendLine($"| `{o.OrderNumber}` | {o.CustomerName} | {o.Warehouse?.Name ?? "Hub"} | {o.Items.Count} | **${o.TotalAmount:N2}** | `{o.Status}` |");
                }
            }
            else
            {
                sb.AppendLine("No orders matching this criteria were found.");
            }

            response.AnswerMarkdown = sb.ToString();

            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "Open Customer Orders",
                Route = "/orders",
                Icon = "🛒"
            });
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "Import New Invoice/PO",
                Route = "/orders",
                QueryParams = new Dictionary<string, string> { { "action", "import" } },
                Icon = "🤖"
            });

            response.FollowUpQuestions = new List<string>
            {
                "How much revenue came from confirmed orders?",
                "Which warehouse fulfilled the most orders?",
                "Show canceled orders and restored stock"
            };
            return response;
        }

        // 3. Warehouse valuation & capacity
        if (q.Contains("warehouse") || q.Contains("capacity") || q.Contains("value") || q.Contains("asset") || q.Contains("valuation"))
        {
            var warehouses = await _unitOfWork.Warehouses.Query().AsNoTracking().ToListAsync();
            var inventories = await _unitOfWork.Inventories.Query()
                .Include(i => i.Product)
                .AsNoTracking()
                .ToListAsync();

            response.Intent = "WarehouseValuation";
            var sb = new StringBuilder();
            sb.AppendLine("### 🏬 Multi-Warehouse Valuation & Capacity Summary");
            sb.AppendLine("| Warehouse Hub | Code | Capacity (Units) | Current Stock | Utilization | Total Asset Valuation |");
            sb.AppendLine("| :--- | :---: | :---: | :---: | :---: | :---: |");

            decimal grandTotalValuation = 0;
            foreach (var w in warehouses)
            {
                var wInvs = inventories.Where(i => i.WarehouseId == w.Id).ToList();
                int totalUnits = wInvs.Sum(i => i.Quantity);
                decimal val = wInvs.Sum(i => i.Quantity * i.Product.Price);
                grandTotalValuation += val;

                double util = w.Capacity > 0 ? Math.Round((double)totalUnits / w.Capacity * 100, 1) : 0;
                sb.AppendLine($"| **{w.Name}** | `{w.Code}` | {w.Capacity:N0} | {totalUnits:N0} | **{util}%** | **${val:N2}** |");
            }

            sb.AppendLine($"\n**Total Enterprise Asset Valuation across all hubs: ${grandTotalValuation:N2}**");
            response.AnswerMarkdown = sb.ToString();

            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "View Operations Dashboard",
                Route = "/dashboard",
                Icon = "📊"
            });

            response.FollowUpQuestions = new List<string>
            {
                "Which warehouse has the highest overstock?",
                "Show low-stock items in Central Hub",
                "Can we do a stock transfer between warehouses?"
            };
            return response;
        }

        // 3.5 Phase 3: Intelligent Audit & Shrinkage / Anomaly Radar
        if (q.Contains("shrinkage") || q.Contains("anomal") || q.Contains("theft") || q.Contains("audit risk") || q.Contains("discrepan") || q.Contains("write-off") || q.Contains("off-hour"))
        {
            var radar = await _anomalyService.GetAnomalyRadarReportAsync();
            response.Intent = "ShrinkageAndAnomalies";
            var sb = new StringBuilder();
            sb.AppendLine("### 🛡️ Phase 3 Intelligent Audit & Shrinkage Radar");
            sb.AppendLine($"* **Active Anomalies Flagged:** `{radar.TotalAnomaliesCount}` (Unresolved)");
            sb.AppendLine($"* **High & Critical Risk Events:** `{radar.HighCount + radar.CriticalCount}`");
            sb.AppendLine($"* **Estimated Financial Exposure:** `${radar.EstimatedTotalExposure:N2}`\n");

            if (radar.Anomalies.Any())
            {
                sb.AppendLine("| Time (UTC) | Type | Severity | Facility | User / Origin | Financial Impact | Description |");
                sb.AppendLine("| :--- | :--- | :---: | :--- | :--- | :---: | :--- |");
                foreach (var a in radar.Anomalies.Take(6))
                {
                    var sevBadge = a.Severity == AnomalySeverity.Critical ? "🔴 Critical" :
                                   a.Severity == AnomalySeverity.High ? "🟠 High" :
                                   a.Severity == AnomalySeverity.Medium ? "🟡 Medium" : "⚪ Low";
                    sb.AppendLine($"| {a.Timestamp:MM-dd HH:mm} | `{a.TypeName}` | {sevBadge} | {a.WarehouseName} | {a.UserEmail} | **${a.EstimatedFinancialExposure:N2}** | {a.Description} |");
                }
            }
            else
            {
                sb.AppendLine("✓ No unresolved inventory shrinkage or suspicious off-hours movements detected!");
            }

            response.AnswerMarkdown = sb.ToString();
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "Open Anomaly Radar Tab",
                Route = "/audit",
                QueryParams = new Dictionary<string, string> { { "tab", "anomalies" } },
                Icon = "🛡️"
            });
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "View Audit Logs",
                Route = "/audit",
                Icon = "📜"
            });

            response.FollowUpQuestions = new List<string>
            {
                "Show supplier reliability scorecards & risk ratings",
                "Show AI restock recommendations",
                "How much capital is tied up in overstock?"
            };
            return response;
        }

        // 4. Phase 3 & Core: Suppliers & Autonomous Replenishment Scorecards
        if (q.Contains("supplier") || q.Contains("vendor") || q.Contains("lead time") || q.Contains("scorecard") || q.Contains("autonomous") || q.Contains("policy"))
        {
            var intel = await _supplierIntelligenceService.GetSupplierIntelligenceReportAsync();
            var policies = (await _supplierIntelligenceService.GetAutonomousPoliciesAsync()).ToList();

            var tier1Count = intel.Scorecards.Count(s => s.Tier == SupplierTier.Tier1Gold);
            var tier2Count = intel.Scorecards.Count(s => s.Tier == SupplierTier.Tier2Silver);
            var highRiskCount = intel.Scorecards.Count(s => s.Tier == SupplierTier.HighRisk || s.Tier == SupplierTier.Tier3Standard);
            var activePoliciesCount = policies.Count(p => p.IsEnabled);

            response.Intent = "SuppliersIntelligence";
            var sb = new StringBuilder();
            sb.AppendLine("### 🤝 Phase 3 Supplier Reliability & Autonomous Replenishment\n");
            sb.AppendLine($"* **Evaluated Suppliers:** `{intel.TotalSuppliersEvaluated}`");
            sb.AppendLine($"* **Tier 1 (Gold Preferred):** `{tier1Count}` | **Tier 2 (Silver):** `{tier2Count}` | **Tier 3 (High Risk):** `{highRiskCount}`");
            sb.AppendLine($"* **Active Autonomous Replenishment Policies:** `{activePoliciesCount}`\n");

            sb.AppendLine("| Supplier Name | Reliability Score | Tier Status | Avg Lead Time | On-Time Prob | Alternate Backup |");
            sb.AppendLine("| :--- | :---: | :---: | :---: | :---: | :--- |");

            foreach (var s in intel.Scorecards)
            {
                var tierBadge = s.Tier == SupplierTier.Tier1Gold ? "🥇 Gold" :
                                s.Tier == SupplierTier.Tier2Silver ? "🥈 Silver" : "⚠️ High Risk";
                var altVendor = string.IsNullOrEmpty(s.RecommendedAlternateSupplierName) ? "Self-Sufficient" : s.RecommendedAlternateSupplierName;
                var onTimePct = (int)(s.OnTimeDeliveryProbability * 100);
                sb.AppendLine($"| **{s.SupplierName}** | **{s.ReliabilityScore}/100** | {tierBadge} | {s.AverageLeadTimeDays}d (±{s.LeadTimeVarianceDays:F1}d) | {onTimePct}% | {altVendor} |");
            }

            if (policies.Any())
            {
                sb.AppendLine("\n#### ⚙️ Autonomous Replenishment Policies");
                foreach (var pol in policies.Take(3))
                {
                    var status = pol.IsEnabled ? "🟢 **Active**" : "⚪ *Disabled*";
                    sb.AppendLine($"- {status} `{pol.Name}` — Auto PO Cap: ${pol.MaxAutoApproveValue:N0}, Runway Trigger: {pol.RunwayThresholdDays} days ({pol.Description})");
                }
            }

            response.AnswerMarkdown = sb.ToString();
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "Open Supplier Scorecards Radar",
                Route = "/suppliers",
                QueryParams = new Dictionary<string, string> { { "view", "ai-scorecard" } },
                Icon = "🤝"
            });
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "View Suppliers Directory",
                Route = "/suppliers",
                Icon = "📋"
            });

            response.FollowUpQuestions = new List<string>
            {
                "Scan for shrinkage & off-hours inventory anomalies",
                "Show AI restock recommendations",
                "Which items have lead times longer than 10 days?"
            };
            return response;
        }

        // 5. Product search fallback
        var products = await _unitOfWork.Products.Query()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .AsNoTracking()
            .ToListAsync();

        var queryTokens = q.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var matchingProds = products
            .Where(p => queryTokens.Any(t => p.Name.Contains(t, StringComparison.OrdinalIgnoreCase) || p.SKU.Contains(t, StringComparison.OrdinalIgnoreCase)))
            .Take(5)
            .ToList();

        if (matchingProds.Any())
        {
            response.Intent = "ProductSearch";
            var sb = new StringBuilder();
            sb.AppendLine($"### 🔍 Matching Catalog Products for: *\"{request.Query}\"*");
            sb.AppendLine("| SKU | Product Name | Category | Unit Price | Safety Level |");
            sb.AppendLine("| :--- | :--- | :--- | :---: | :---: |");

            foreach (var p in matchingProds)
            {
                sb.AppendLine($"| `{p.SKU}` | **{p.Name}** | {p.Category?.Name ?? "General"} | **${p.Price:N2}** | {p.ReorderLevel} units |");
            }

            response.AnswerMarkdown = sb.ToString();
            response.SuggestedActions.Add(new CopilotActionDto
            {
                Label = "View Products Catalog",
                Route = "/products",
                Icon = "🏷️"
            });
            return response;
        }

        // Default response
        response.AnswerMarkdown = $"I searched across your inventory catalog, orders, and warehouses for **\"{request.Query}\"**, but found no direct records matching that specific phrase.\n\nTry asking about:\n- **\"Low stock alerts\"**\n- **\"Pending orders\"**\n- **\"Warehouse valuations\"**\n- **\"Suppliers\"**\n- Or search for a specific product like **\"laptop\"**, **\"monitor\"**, or **\"switch\"**.";
        response.FollowUpQuestions = new List<string>
        {
            "Show me low stock items",
            "What are the latest orders?",
            "List all warehouses"
        };
        return response;
    }
}
