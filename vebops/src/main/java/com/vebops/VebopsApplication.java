package com.vebops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VebopsApplication {

	public static void main(String[] args) {
		SpringApplication.run(VebopsApplication.class, args);
	}

}
