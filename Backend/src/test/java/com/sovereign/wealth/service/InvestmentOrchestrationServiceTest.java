package com.sovereign.wealth.service;

import com.sovereign.wealth.dto.AgentExecutionResponse;
import com.sovereign.wealth.dto.UserPortfolioRequest;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InvestmentOrchestrationServiceTest {

    @Test
    void fallsBackToLocalQuantWhenModelIsNotConfigured() {
        AgentTraceSink traces = new AgentTraceSink();
        InvestmentOrchestrationService service = new InvestmentOrchestrationService(
                noModelProvider(),
                new PortfolioOrchestratorTools(traces),
                traces
        );

        AgentExecutionResponse response = service.optimize(new UserPortfolioRequest(
                "Treasury desk: liquidity covenant, no leverage.",
                250_000.0,
                1_200_000.0,
                400_000.0
        ));

        assertThat(response.mode()).isEqualTo("local-quant");
        assertThat(response.structuredRecommendation())
                .contains("deterministic local analyst")
                .contains("Crypto: sell $65,000.00")
                .contains("Cash: buy $155,000.00");
        assertThat(response.agentTraceLogs()).anySatisfy(line ->
                assertThat(line).contains("MODEL_FALLBACK")
        );
    }

    @Test
    void rejectsZeroNavBeforeRunningTools() {
        AgentTraceSink traces = new AgentTraceSink();
        InvestmentOrchestrationService service = new InvestmentOrchestrationService(
                noModelProvider(),
                new PortfolioOrchestratorTools(traces),
                traces
        );

        assertThatThrownBy(() -> service.optimize(new UserPortfolioRequest(
                "Empty portfolio",
                0.0,
                0.0,
                0.0
        ))).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("strictly positive");
    }

    private static ObjectProvider<ChatLanguageModel> noModelProvider() {
        return new StaticListableBeanFactory().getBeanProvider(ChatLanguageModel.class);
    }
}
