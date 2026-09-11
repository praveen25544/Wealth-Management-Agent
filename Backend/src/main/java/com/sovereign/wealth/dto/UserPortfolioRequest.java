package com.sovereign.wealth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UserPortfolioRequest(
        @NotBlank @Size(max = 2000) String clientProfileContext,
        @NotNull @PositiveOrZero Double currentCryptoAllocation,
        @NotNull @PositiveOrZero Double currentEquityAllocation,
        @NotNull @PositiveOrZero Double currentCashAllocation
) {
}
