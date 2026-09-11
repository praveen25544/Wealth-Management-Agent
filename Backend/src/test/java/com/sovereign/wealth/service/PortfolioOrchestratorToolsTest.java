package com.sovereign.wealth.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.withinPercentage;

class PortfolioOrchestratorToolsTest {

    private final AgentTraceSink traces = new AgentTraceSink();
    private final PortfolioOrchestratorTools tools = new PortfolioOrchestratorTools(traces);

    @Test
    void calculatesRiskCoefficientAndTraceForPortfolio() {
        double risk = tools.calculateSystemicVolatilityIndex(250_000, 1_200_000, 400_000);

        assertThat(risk).isCloseTo(0.1124, withinPercentage(1.0));
        assertThat(traces.snapshot()).anySatisfy(line ->
                assertThat(line).contains("isolationRiskCoefficient")
        );
    }

    @Test
    void buildsExactRebalanceMatrix() {
        String matrix = tools.executeAssetRebalanceMatrix(250_000, 1_200_000, 400_000);

        assertThat(matrix)
                .contains("nav=1850000.000000")
                .contains("cryptoDelta=-65000.000000 (SELL)")
                .contains("equityDelta=-90000.000000 (SELL)")
                .contains("cashDelta=+155000.000000 (BUY)");
    }
}
