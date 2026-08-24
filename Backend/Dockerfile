# syntax=docker/dockerfile:1.7

FROM eclipse-temurin:21-jdk-alpine AS compiler
WORKDIR /workspace

COPY pom.xml .
COPY src ./src

RUN apk add --no-cache maven \
    && mvn -B -DskipTests package \
    && mkdir -p /workspace/extracted \
    && java -Djarmode=layertools -jar /workspace/target/*.jar extract --destination /workspace/extracted

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /opt/app

RUN addgroup -S sovereign && adduser -S sovereign -G sovereign

COPY --from=compiler /workspace/extracted/dependencies/ ./
COPY --from=compiler /workspace/extracted/spring-boot-loader/ ./
COPY --from=compiler /workspace/extracted/snapshot-dependencies/ ./
COPY --from=compiler /workspace/extracted/application/ ./

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"
EXPOSE 8080

USER sovereign
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
