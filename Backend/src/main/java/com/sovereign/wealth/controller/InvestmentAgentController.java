package com.sovereign.wealth.controller;

import com.sovereign.wealth.dto.AgentExecutionResponse;
import com.sovereign.wealth.dto.UserPortfolioRequest;
import com.sovereign.wealth.service.InvestmentOrchestrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wealth")
@RequiredArgsConstructor
public class InvestmentAgentController {

    private final InvestmentOrchestrationService orchestrationService;

    @PostMapping(path = "/optimize", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public AgentExecutionResponse optimize(@Valid @RequestBody UserPortfolioRequest request) {
        return orchestrationService.optimize(request);
    }
}
