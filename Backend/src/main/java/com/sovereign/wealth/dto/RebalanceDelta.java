package com.sovereign.wealth.dto;

public record RebalanceDelta(
        double cryptoBuySellDelta,
        double equityBuySellDelta,
        double cashBuySellDelta,
        double targetCryptoWeight,
        double targetEquityWeight,
        double targetCashWeight
) {
}
