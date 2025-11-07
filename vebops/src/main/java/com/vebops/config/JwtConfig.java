package com.vebops.config;

import com.vebops.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {
    @Bean
    public JwtUtil jwtUtil(@Value("${vebops.jwt-secret}") String secret) {
        return new JwtUtil(secret, 1000L * 60 * 60 * 8); // 8 hours
    }
}
