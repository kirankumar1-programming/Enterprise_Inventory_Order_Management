namespace EnterpriseInventory.Core.Enums;

public enum OrderStatus
{
    Pending = 1,
    Confirmed = 2,
    Shipped = 3,
    Delivered = 4,
    Cancelled = 5
}

public enum MovementType
{
    PurchaseReceive = 1,
    OrderFulfillment = 2,
    StockAdjustment = 3,
    OrderCancellationReturn = 4,
    TransferIn = 5,
    TransferOut = 6
}
