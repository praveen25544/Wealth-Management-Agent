package com.sovereign.wealth.config;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GeminiModelConfig {

    @Bean
    @ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${gemini.api.key:}')")
    public ChatLanguageModel chatLanguageModel(
            @Value("${gemini.api.key}") String apiKey,
            @Value("${gemini.model}") String modelName
    ) {
        return GoogleAiGeminiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(0.15)
                .maxOutputTokens(2048)
                .build();
    }
}
