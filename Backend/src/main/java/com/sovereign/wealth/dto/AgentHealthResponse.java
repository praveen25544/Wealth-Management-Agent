package com.sovereign.wealth.dto;

import java.time.Instant;

public record AgentHealthResponse(
        String status,
        String mode,
        String model,
        Instant checkedAt
) {
}
