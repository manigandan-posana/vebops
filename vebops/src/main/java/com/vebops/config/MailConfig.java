package com.vebops.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Basic mail configuration. In a production environment the SMTP server
 * properties (host, port, username and password) should be supplied via
 * application properties or environment variables. This bean allows Spring
 * Boot's {@link JavaMailSender} to be autowired into services.
 */
@Configuration
public class MailConfig {
    @Bean
    public JavaMailSender javaMailSender(org.springframework.core.env.Environment env) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(env.getProperty("spring.mail.host", "localhost"));
        mailSender.setPort(env.getProperty("spring.mail.port", Integer.class, 25));
        mailSender.setUsername(env.getProperty("spring.mail.username"));
        mailSender.setPassword(env.getProperty("spring.mail.password"));

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", env.getProperty("spring.mail.properties.mail.transport.protocol", "smtp"));
        props.put("mail.smtp.auth", env.getProperty("spring.mail.properties.mail.smtp.auth", "false"));
        props.put("mail.smtp.starttls.enable", env.getProperty("spring.mail.properties.mail.smtp.starttls.enable", "false"));
        props.put("mail.debug", env.getProperty("spring.mail.properties.mail.debug", "false"));
        return mailSender;
    }
}