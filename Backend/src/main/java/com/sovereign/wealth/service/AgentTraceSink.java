package com.sovereign.wealth.service;

import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@RequestScope
public class AgentTraceSink {

    private final List<String> logs = new ArrayList<>();

    public void step(String phase, String detail) {
        logs.add("[%s] [%s] %s".formatted(Instant.now(), phase, detail));
    }

    public List<String> snapshot() {
        return Collections.unmodifiableList(new ArrayList<>(logs));
    }
}
